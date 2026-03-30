import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from 'docx'
import type { ContestFormField } from '../analyze/route'

interface GenerateRequest {
  contestName: string
  fields: ContestFormField[]
  projectTitle: string
}

export async function POST(req: NextRequest) {
  let body: GenerateRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const { contestName, fields, projectTitle } = body
  const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  // ─── 문서 빌드 ─────────────────────────────────────────
  const tableRows = fields.map(field => {
    const isLong = field.type === 'textarea'
    return new TableRow({
      children: [
        // 항목명 셀
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: 'F3F0FF' },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'C4B5FD' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'C4B5FD' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'C4B5FD' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'C4B5FD' },
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: field.label + (field.required ? ' *' : ''),
                  bold: true,
                  size: 20,
                  color: '5B21B6',
                }),
              ],
              spacing: { before: 80, after: 80 },
              indent: { left: 120 },
            }),
            ...(field.description ? [
              new Paragraph({
                children: [new TextRun({ text: field.description, size: 16, color: '9CA3AF', italics: true })],
                spacing: { before: 0, after: 80 },
                indent: { left: 120 },
              }),
            ] : []),
          ],
        }),
        // 내용 셀
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          },
          children: field.value
            ? (isLong
                ? field.value.split('\n').map(line =>
                    new Paragraph({
                      children: [new TextRun({ text: line, size: 20 })],
                      spacing: { before: 40, after: 40 },
                      indent: { left: 120, right: 120 },
                    })
                  )
                : [new Paragraph({
                    children: [new TextRun({ text: field.value, size: 20 })],
                    spacing: { before: 80, after: 80 },
                    indent: { left: 120 },
                  })]
              )
            : [new Paragraph({
                children: [new TextRun({ text: '(미작성)', size: 20, color: 'D1D5DB', italics: true })],
                spacing: { before: 80, after: 80 },
                indent: { left: 120 },
              })],
        }),
      ],
    })
  })

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // 헤더: 공모전명
        new Paragraph({
          text: contestName,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
        }),
        // 작품명
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          children: [
            new TextRun({ text: '작품명: ', bold: true, size: 28, color: '374151' }),
            new TextRun({ text: projectTitle, bold: true, size: 28, color: '7C3AED' }),
          ],
        }),
        // 작성일
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 600 },
          children: [new TextRun({ text: `작성일: ${dateStr}`, size: 20, color: '9CA3AF' })],
        }),
        // 구분선 역할 단락
        new Paragraph({ text: '', spacing: { before: 0, after: 200 } }),
        // 필드 테이블
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }),
        // 하단 여백
        new Paragraph({ text: '', spacing: { before: 600, after: 0 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `본 문서는 Creature Studio AI에 의해 자동 작성되었습니다. (${dateStr})`,
              size: 16,
              color: 'D1D5DB',
              italics: true,
            }),
          ],
        }),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const uint8 = new Uint8Array(buffer)

  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(`${contestName}_신청서_${projectTitle}.docx`)}"`,
    },
  })
}
