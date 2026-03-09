// Simple Markdown Parser (Refined)
function parseMarkdown(md) {
    let html = md
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n/g, '<br>');

    // Wrap <li> into <ul>
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    html = html.replace(/<\/ul><br><ul>/gim, ''); // Cleanup line breaks between lists
    html = html.replace(/<\/ul><ul>/gim, ''); 

    // Handle paragraphs
    const lines = html.split('<br>');
    const result = lines.map(line => {
        if (!line.trim()) return '';
        if (line.startsWith('<')) return line;
        return `<p>${line}</p>`;
    }).join('');

    return result;
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

    try {
        const response = await fetch('http://localhost:8787/api/match', {
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
                        // Auto-scroll logic
                        const scrollingElement = (document.scrollingElement || document.body);
                        scrollingElement.scrollTop = scrollingElement.scrollHeight;
                    }
                } catch (e) {}
            }
        }
        
        statusText.innerText = "为您生成的专属匹配报告如下：";

    } catch (error) {
        resultContent.innerHTML = `<p class="error-msg">❌ 错误: ${error.message}</p>`;
    }
});

document.getElementById('retry-btn').addEventListener('click', () => {
    document.getElementById('quiz-form').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('result-content').innerHTML = '';
});
