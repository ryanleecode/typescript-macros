import { NodeVisitor } from 'simple-ts-transform'
import {
  isIdentifier,
  isTaggedTemplateExpression,
  Node,
  SyntaxKind,
  TaggedTemplateExpression,
} from 'typescript'
import { Context } from './Context'

export class MacroVisitor implements NodeVisitor<TaggedTemplateExpression> {
  public constructor(private readonly context: Context) {}

  public wants(node: Node): node is TaggedTemplateExpression {
    return isTaggedTemplateExpression(node)
  }

  public visit(node: TaggedTemplateExpression): Node[] {
    const { defineMacroIdents, factory } = this.context
    const { tag, template } = node

    if (!isIdentifier(tag) || !defineMacroIdents.has(tag.text)) {
      return [node]
    }

    switch (template.kind) {
      case SyntaxKind.NoSubstitutionTemplateLiteral:
        // TODO parse
        break
      case SyntaxKind.TemplateExpression:
        // no-op because defineMacro only takes one parameter
        break
      default:
        break
    }

    return [factory.createEmptyStatement()]
  }
}
