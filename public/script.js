// Robust Markdown Parser
function parseMarkdown(md) {
    const lines = md.split('\n');
    let inList = false;
    let html = '';

    const parseInline = (text) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
            if (inList) { html += '</ul>\n'; inList = false; }
            continue;
        }

        let headerMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (headerMatch) {
            if (inList) { html += '</ul>\n'; inList = false; }
            let level = headerMatch[1].length;
            html += `<h${level}>${parseInline(headerMatch[2])}</h${level}>\n`;
            continue;
        }

        if (line === '---' || line === '***' || line === '___') {
            if (inList) { html += '</ul>\n'; inList = false; }
            html += '<hr>\n';
            continue;
        }

        let listMatch = line.match(/^[\*\-]\s+(.*)/);
        if (listMatch) {
            if (!inList) { html += '<ul>\n'; inList = true; }
            html += `<li>${parseInline(listMatch[1])}</li>\n`;
            continue;
        }

        if (inList) { html += '</ul>\n'; inList = false; }
        html += `<p>${parseInline(line)}</p>\n`;
    }

    if (inList) { html += '</ul>\n'; }
    return html;
}

// Handle Option Button Selection
document.querySelectorAll('.option-group').forEach(group => {
    group.addEventListener('click', e => {
        const btn = e.target.closest('.option-btn');
        if (!btn) return;
        group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.getElementById('submit-btn').addEventListener('click', async () => {
    const food = document.querySelector('#food-group .active').dataset.value;
    const climate = document.querySelector('#climate-group .active').dataset.value;
    const pace = document.querySelector('#pace-group .active').dataset.value;
    const interest = document.querySelector('#interest-group .active').dataset.value;
    const description = document.getElementById('description').value;

    const quizForm = document.getElementById('quiz-form');
    const resultContainer = document.getElementById('result-container');
    const resultContent = document.getElementById('result-content');

    quizForm.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    
    resultContent.innerHTML = `
        <div id="thinking-box" class="thinking-container">
            <div class="loader-sm" id="thinking-loader"></div>
            <span class="status-text" id="status-text">AI 正在进行逻辑建模...</span>
            <div class="thinking-content hidden"></div>
        </div>
        <div id="final-match" class="stream-box"></div>
    `;
    
    const thinkingBox = document.getElementById('thinking-box');
    const thinkingLoader = document.getElementById('thinking-loader');
    const statusText = document.getElementById('status-text');
    const thinkingContent = thinkingBox.querySelector('.thinking-content');
    const finalMatch = document.getElementById('final-match');

    let isAutoScrolling = true;
    const scrollHandler = () => {
        const threshold = 100; // px from bottom
        const isAtBottom = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - threshold);
        isAutoScrolling = isAtBottom;
    };
    window.addEventListener('scroll', scrollHandler);

    try {
        const response = await fetch('/api/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ food, climate, pace, interest, description }),
        });

        if (!response.ok) throw new Error('AI 服务响应异常');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullReasoning = '';
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                
                const dataStr = trimmed.slice(6);
                if (dataStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(dataStr);
                    const delta = json.choices[0].delta;
                    
                    if (delta.reasoning_content) {
                        thinkingContent.classList.remove('hidden');
                        fullReasoning += delta.reasoning_content;
                        thinkingContent.innerText = fullReasoning;
                        statusText.innerText = "正在深度画像分析...";
                    } 
                    
                    if (delta.content) {
                        if (fullContent === '') {
                             thinkingBox.classList.add('collapsed');
                             thinkingLoader.classList.add('hidden');
                             statusText.innerText = "分析完成，生成报告中：";
                        }
                        fullContent += delta.content;
                        finalMatch.innerHTML = parseMarkdown(fullContent);
                        
                        // Smart Auto-scroll
                        if (isAutoScrolling) {
                            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        }
                    }
                } catch (e) {}
            }
        }
        
        statusText.innerText = "为您生成的专属匹配报告如下：";
        window.removeEventListener('scroll', scrollHandler);

    } catch (error) {
        window.removeEventListener('scroll', scrollHandler);
        resultContent.innerHTML = `<p class="error-msg">❌ 错误: ${error.message}</p>`;
    }
});

document.getElementById('retry-btn').addEventListener('click', () => {
    document.getElementById('quiz-form').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('result-content').innerHTML = '';
});
