import { POST as handleUpload } from '../upload/route';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return handleUpload(request);
}
