export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { question } = body || {};

    if (!process.env.GROQ_API_KEY) {
      return res.status(200).json({
        candidates: [{ content: { parts: [{ text: "⚠️ يرجى إضافة مفتاح GROQ_API_KEY في إعدادات Vercel ثم عمل Redeploy." }] } }]
      });
    }

    const systemPrompt = `أنت مستشار قانوني جزائري خبير ومتخصص حصرياً في **قانون العقوبات الجزائري** (الأمر رقم 66-156 المعدل والمتمم بجميع القوانين السارية المفعول، بما فيها تعديلات 2024 و2025 و2026).

قواعد العمل الصارمة:
1. أجب باللغة العربية الفصحى الدقيقة وبناءً على قانون العقوبات الجزائري المحيّن فقط.
2. اذكر رقم المادة القانونية بدقة، وأركان الجريمة، والعقوبات المقررة (الحبس/السجن، الغرامة بالدينار الجزائري، العقوبات التكميلية، والظروف المشددة أو الأعذار).
3. إذا كانت المادة ملغاة (مثل المادة 55 الملغاة بالقانون 06-23) أو معوّضة بقوانين خاصة (مثل قوانين التزوير أو الفساد أو الاختطاف)، وضّح ذلك بدقة مع الإشارة إلى النص البديل الساري.
4. إذا كان السؤال خارج نطاق قانون العقوبات الجزائري، اعتذر بلباقة وقل: "عذراً، تخصصي يقتصر على أحكام قانون العقوبات الجزائري فقط."
5. نظم الإجابة في نقاط واضحة ومباشرة.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.2
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({
        candidates: [{ content: { parts: [{ text: `⚠️ خطأ من الخادم: ${data.error.message}` }] } }]
      });
    }

    const replyText = data.choices?.[0]?.message?.content || 'لم يتم الحصول على إجابة.';

    // إرجاع النتيجة بنفس الصيغة التي تفهمها واجهة index.html دون الحاجة لتعديلها
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: replyText }] } }]
    });

  } catch (error) {
    return res.status(200).json({
      candidates: [{ content: { parts: [{ text: `⚠️ خطأ تقني: ${error.message}` }] } }]
    });
  }
}
