document.getElementById('submit-btn').addEventListener('click', async () => {
    const food = document.getElementById('food').value;
    const climate = document.getElementById('climate').value;
    const pace = document.getElementById('pace').value;
    const interest = document.getElementById('interest').value;
    const description = document.getElementById('description').value;

    const quizForm = document.getElementById('quiz-form');
    const resultContainer = document.getElementById('result-container');
    const resultContent = document.getElementById('result-content');

    // Switch view
    quizForm.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    resultContent.innerHTML = '<div class="loader"></div><p>AI 正在为你精准匹配城市...</p>';

    try {
        const response = await fetch('/api/match', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                food,
                climate,
                pace,
                interest,
                description
            }),
        });

        if (!response.ok) {
            throw new Error('网络请求失败，请稍后再试');
        }

        const data = await response.json();
        resultContent.innerHTML = data.recommendation;
    } catch (error) {
        resultContent.innerHTML = `<p style="color: red;">错误: ${error.message}</p>`;
    }
});

document.getElementById('retry-btn').addEventListener('click', () => {
    document.getElementById('quiz-form').classList.remove('hidden');
    document.getElementById('result-container').classList.add('hidden');
});
