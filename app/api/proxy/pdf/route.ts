import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const targetUrl = searchParams.get('url');
  const token = searchParams.get('token');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  try {
    // Fetch the PDF from the upstream server with the token
    const response = await axios.get(targetUrl, {
      responseType: 'arraybuffer',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    // Return the PDF with the correct headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', 'inline; filename="document.pdf"');

    return new NextResponse(response.data, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Proxy Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}
