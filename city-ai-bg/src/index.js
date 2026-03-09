export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/api/match' && request.method === 'POST') {
      try {
        if (!env.ZAI_API_KEY || env.ZAI_API_KEY === 'REPLACE_ME') {
          return new Response(JSON.stringify({ error: 'API Key not configured' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await request.json();
        const { food, climate, pace, interest, description } = body;

        const systemPrompt = `你是一个非常专业且有趣的中国城市推荐专家。
根据用户提供的信息（饮食偏好、理想气候、生活节奏、兴趣爱好、自我描述），为他们推荐一个最适合在中国大陆居住的城市。
请以幽默风趣、富有文学气息的语气回答，不仅要给出城市名，还要给出推荐理由（包括美食、气候、人文、工作机会等方面），最后给出一个专属的“城市契合度”百分比。
请使用标准的 Markdown 格式输出，确保结构清晰，逻辑严密。`;

        const userPrompt = `偏好：${food}, 气候：${climate}, 节奏：${pace}, 兴趣：${interest}, 描述：${description}`;

        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.ZAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "glm-5",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            stream: true,
            temperature: 0.8,
            extra_body: { enable_thinking: true }
          })
        });

        // 直接转发流，不对内容做二次包装，减少出错概率
        return new Response(response.body, {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
