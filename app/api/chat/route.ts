import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export const runtime = 'nodejs';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Type safety for messages
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server configuration error", details: "API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Parse the multipart form data
    const formData = await req.formData();
    const messagesJson = formData.get('messages') as string;
    const file = formData.get('image') as File | null;

    const messages: ChatMessage[] = JSON.parse(messagesJson);

    let imageData: Buffer | null = null;
    if (file && file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      imageData = Buffer.from(arrayBuffer);
      // You can now send imageData to a vision model or store it temporarily
    }
    // You can send imageData to a vision model (not Groq yet)
    // For now, just generate a response based on messages
    const groq = new Groq({ apiKey, timeout: 15000 });

   
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama3-70b-8192',
      temperature: 0.7,
    });

 

    const content = completion.choices?.[0]?.message?.content || 'No response';

    return NextResponse.json({
      success: true,
      content,
      tokens_used: completion.usage?.total_tokens || 0,
      model: completion.model,
    });
  } catch (error: any) {
    console.error('GROQ_API_ERROR:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'AI processing failed',
        details: error.message,
      },
      { status: 502 }
    );
  }
}