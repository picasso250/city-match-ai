export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle Preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API Matching Logic
    if (url.pathname === '/api/match' && request.method === 'POST') {
      try {
        if (!env.ZHIPU_API_KEY || env.ZHIPU_API_KEY === 'REPLACE_ME') {
          return new Response(JSON.stringify({ error: '请在 Cloudflare Worker 中配置 ZHIPU_API_KEY' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await request.json();
        const { food, climate, pace, interest, description } = body;

        const systemPrompt = `你是一个非常专业且有趣的中国城市推荐专家。
根据用户提供的信息（饮食偏好、理想气候、生活节奏、兴趣爱好、自我描述），为他们推荐一个最适合在中国大陆居住的城市。
请以幽默风趣、富有文学气息的语气回答，不仅要给出城市名，还要给出推荐理由（包括美食、气候、人文、工作机会等方面），最后给出一个专属的“城市契合度”百分比。
请直接返回 HTML 格式的文本，以便前端直接展示（使用 <h3>, <p>, <ul>, <li> 等标签）。`;

        const userPrompt = `我的情况如下：
- 饮食偏好：${food}
- 理想气候：${climate}
- 生活节奏：${pace}
- 兴趣爱好：${interest}
- 更多描述：${description}

请帮我看看我适合哪个城市？`;

        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.ZHIPU_API_KEY}`
          },
          body: JSON.stringify({
            model: "glm-4-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
          })
        });

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message || 'AI API 返回错误');
        }

        const recommendation = data.choices[0].message.content;

        return new Response(JSON.stringify({ recommendation }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('API Endpoint Found. Use POST /api/match to get recommendations.', { 
      status: 404, 
      headers: corsHeaders 
    });
  }
};
