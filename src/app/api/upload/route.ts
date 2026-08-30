import { NextRequest, NextResponse } from 'next/server';
import { processProjectInput, ExtractedWorkspace } from '@/lib/engine/extract';
import { createProjectSnapshot } from '@/lib/engine/snapshot';
import { ProjectSnapshot } from '@/types/project.types';

export interface UploadApiResponse {
  success: boolean;
  projectId: string;
  workspace: ExtractedWorkspace;
  snapshot: ProjectSnapshot;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get('content-type') || '';
    let input: Buffer | string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      const file = formData.get('file');
      const dirPath = 
        (formData.get('path') as string | null) ||
        (formData.get('directoryPath') as string | null) ||
        (formData.get('workspacePath') as string | null) ||
        (formData.get('directory') as string | null);

      if (file && typeof file === 'object' && 'arrayBuffer' in file) {
        const arrayBuffer = await (file as Blob).arrayBuffer();
        if (arrayBuffer.byteLength > 0) {
          input = Buffer.from(arrayBuffer);
        }
      }

      if (!input && dirPath && typeof dirPath === 'string' && dirPath.trim().length > 0) {
        input = dirPath.trim();
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      const dirPath = body.path || body.directoryPath || body.workspacePath || body.directory;

      if (dirPath && typeof dirPath === 'string' && dirPath.trim().length > 0) {
        input = dirPath.trim();
      } else if (body.fileBuffer && typeof body.fileBuffer === 'string') {
        input = Buffer.from(body.fileBuffer, 'base64');
      }
    } else {
      // Fallback for raw binary uploads or unspecified content-type
      const arrayBuffer = await request.arrayBuffer();
      if (arrayBuffer && arrayBuffer.byteLength > 0) {
        input = Buffer.from(arrayBuffer);
      }
    }

    if (!input) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid file upload or directory path provided in request.',
        },
        { status: 400 }
      );
    }

    const workspace = await processProjectInput(input);
    const snapshot = createProjectSnapshot(workspace);

    return NextResponse.json(
      {
        success: true,
        projectId: snapshot.id,
        workspace,
        snapshot,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'An unknown error occurred during project processing.',
      },
      { status: 400 }
    );
  }
}
