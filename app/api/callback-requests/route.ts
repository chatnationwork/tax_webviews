import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type CallbackEntry = {
  id: string;
  name: string;
  phone: string;
  issue: string;
  timestamp: string;
  status: 'pending';
};

const DATA_DIRECTORY = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIRECTORY, 'callback-requests.json');

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readEntries(): Promise<CallbackEntry[]> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid callback request store format.');
  }
  return parsed;
}

function generateReferenceId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CB-${year}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const issue = typeof body.issue === 'string' ? body.issue.trim() : '';
    const timestamp =
      typeof body.timestamp === 'string' && body.timestamp
        ? body.timestamp
        : new Date().toISOString();
    const status: 'pending' = 'pending';

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required.' },
        { status: 400 }
      );
    }

    const entry: CallbackEntry = {
      id: generateReferenceId(),
      name,
      phone,
      issue,
      timestamp,
      status,
    };

    const entries = await readEntries();
    entries.push(entry);
    await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2), 'utf8');

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Failed to create callback request', error);
    return NextResponse.json(
      { error: 'Unable to save callback request.' },
      { status: 500 }
    );
  }
}
