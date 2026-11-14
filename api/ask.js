export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { question } = body || {};

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        candidates: [{ content: { parts: [{ text: "⚠️ مفتاح GEMINI_API_KEY غير مقروء في Vercel، قم بعمل Redeploy." }] } }]
      });
    }

    const systemPrompt = `أنت مستشار قانوني جزائري خبير ومتخصص حصرياً في **قانون العقوبات الجزائري** (الأمر رقم 66-156 المعدل والمتمم بجميع القوانين السارية المفعول، بما فيها تعديلات 2024 و2025 و2026).

قواعد العمل الصارمة:
1. اعتمد في إجاباتك على النص المحيّن لقانون العقوبات الجزائري، واستخدم أداة البحث للتحقق من آخر التعديلات المنشورة في الجريدة الرسمية للجمهورية الجزائرية (joradp.dz) وبوابة وزارة العدل (droit.mjustice.gov.dz) لضمان دقة العقوبات والغرامات والمواد المكررة والملغاة.
2. إذا سُئلت عن رقم مادة معينة، اعرض نصها القانوني الدقيق ومضمونها والعقوبات المقررة فيها (الحبس/السجن، الغرامة، العقوبات التكميلية، والظروف المشددة أو الأعذار).
3. إذا سُئلت عن تكييف واقعة أو جريمة، اذكر التكييف القانوني الصحيح، أركان الجريمة، ورقم المادة والعقوبة المقررة في قانون العقوبات الجزائري.
4. إذا كان السؤال خارج نطاق قانون العقوبات الجزائري (مثل القانون المدني، الأسرة، أو قوانين دول أخرى)، اعتذر بلباقة وقل: "عذراً، تخصصي يقتصر على أحكام قانون العقوبات الجزائري فقط."
5. نظم إجابتك في نقاط واضحة ومهنية مع إبراز أرقام المواد والعقوبات.

سؤال المستخدم: ${question}`;

    const models = [
      'gemini-3.8-flash',
      'gemini-3.0-flash',
      'gemini-2.5-flash'
    ];

    let lastError = '';

    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            tools: [{ google_search: {} }] // تفعيل البحث المباشر في الإنترنت لتحديث القوانين تلقائياً
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
      candidates: [{ content: { parts: [{ text: `⚠️ الخوادم مزدحمة حالياً، يرجى المحاولة بعد قليل. (${lastError})` }] } }]
    });
  } catch (error) {
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: `⚠️ خطأ تقني: ${error.message}` }] } }]
    });
  }
}
