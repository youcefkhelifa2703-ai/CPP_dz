export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { question, lawsContext } = body || {};

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        candidates: [{ content: { parts: [{ text: "⚠️ مفتاح GEMINI_API_KEY غير مقروء في Vercel، قم بعمل Redeploy." }] } }]
      });
    }

    const systemPrompt = `أنت مساعد قانوني جزائري متخصص حصرياً في قانون الإجراءات الجزائية الجزائري.
قواعد صارمة:
1. أجب فقط بناءً على قانون الإجراءات الجزائية الجزائري والنصوص المرفقة هنا: ${lawsContext}
2. إذا سُئلت عن أي موضوع خارج قانون الإجراءات الجزائية الجزائري اعتذر وقل: "عذراً، تخصصي يقتصر على أحكام قانون الإجراءات الجزائية الجزائري فقط."
3. اذكر رقم المادة القانونية بدقة في إجابتك.
سؤال المستخدم: ${question}`;

    const models = [
      'gemini-3.8-flash',
      'gemini-3.8-flash-lite',
      'gemini-3.0-flash',
      'gemini-2.5-flash-lite'
    ];

    let lastError = '';

    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }]
          })
        }
      );

      const data = await response.json();

      if (!data.error && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json(data);
      }

      lastError = data.error?.message || 'فشل الاستجابة من النموذج';
    }

    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: `⚠️ جميع النماذج مزدحمة حالياً، يرجى المحاولة بعد قليل. (${lastError})` }] } }]
    });
  } catch (error) {
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: `⚠️ خطأ تقني: ${error.message}` }] } }]
    });
  }
}
