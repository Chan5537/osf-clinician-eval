import { cn } from '@/lib/utils'
import { InlineEmphasis } from '@/components/InlineEmphasis'

// Renders the rubric's "How to score it" and worked-example strings, which since rubric v15 carry
// STRUCTURE: definition lists, Full/Partial/Minimal tables, and an example laid out as a patient
// block followed by one response per score. A single InlineEmphasis line cannot show that.
//
// DELIBERATELY A BLOCK-LEVEL PARSER ONLY, for the same reason InlineEmphasis is not Markdown: the
// strings quote clinical text ("Chronic renal failure [CKD]", "Osteoarthritis; localized"), and an
// inline Markdown pass could reinterpret brackets or underscores. Blocks are separated by a blank
// line and recognised by their leading characters; everything inside a block still goes through
// InlineEmphasis, so the only inline formatting remains `**bold**`.
//
//   paragraph   any block that is not one of the below (lines are joined with a space)
//   list        every line starts with "- " or "1. "; two-space indentation nests a level
//   table       every line starts with "|"; first row is the header, a |---| row is skipped

interface ListNode {
  text: string
  ordered: boolean
  children: ListNode[]
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: ListNode[] }
  | { kind: 'table'; head: string[]; rows: string[][] }

const LIST_LINE = /^( *)(?:-|(\d+)\.) +(.*)$/
const TABLE_SEPARATOR = /^[\s|:-]+$/

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())
}

function listTree(lines: string[]): ListNode[] {
  const root: ListNode[] = []
  // Each frame is the list that receives lines indented deeper than `indent`.
  const stack: { indent: number; items: ListNode[] }[] = [{ indent: -1, items: root }]
  for (const line of lines) {
    const m = LIST_LINE.exec(line)
    if (!m) continue
    const indent = m[1].length
    const node: ListNode = { text: m[3], ordered: m[2] !== undefined, children: [] }
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop()
    stack[stack.length - 1].items.push(node)
    stack.push({ indent, items: node.children })
  }
  return root
}

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = []
  for (const chunk of source.split(/\n[ \t]*\n/)) {
    const lines = chunk.split('\n').filter((l) => l.trim() !== '')
    if (lines.length === 0) continue
    if (lines.every((l) => l.trim().startsWith('|'))) {
      const [head, ...rest] = lines
      const body = rest.length > 0 && TABLE_SEPARATOR.test(rest[0]) ? rest.slice(1) : rest
      blocks.push({ kind: 'table', head: tableCells(head), rows: body.map(tableCells) })
    } else if (lines.every((l) => LIST_LINE.test(l))) {
      blocks.push({ kind: 'list', items: listTree(lines) })
    } else {
      blocks.push({ kind: 'p', text: lines.map((l) => l.trim()).join(' ') })
    }
  }
  return blocks
}

function List({ items }: { items: ListNode[] }) {
  const ordered = items[0]?.ordered ?? false
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <Tag className={cn('space-y-0.5 pl-4', ordered ? 'list-decimal' : 'list-disc')}>
      {items.map((item, i) => (
        <li key={i}>
          <InlineEmphasis text={item.text} />
          {item.children.length > 0 && <List items={item.children} />}
        </li>
      ))}
    </Tag>
  )
}

export function RubricText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {parseBlocks(text).map((block, i) => {
        if (block.kind === 'list') return <List key={i} items={block.items} />
        if (block.kind === 'table') {
          return (
            <div key={i} className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    {block.head.map((h, j) => (
                      <th key={j} className="border-b px-1.5 py-1 align-bottom font-semibold text-foreground">
                        <InlineEmphasis text={h} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className={cn(
                            'border-b border-border/60 px-1.5 py-1 align-top',
                            j === 0 && 'whitespace-nowrap font-medium text-foreground',
                          )}
                        >
                          <InlineEmphasis text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        return (
          <p key={i}>
            <InlineEmphasis text={block.text} />
          </p>
        )
      })}
    </div>
  )
}
