import { constVoid, pipe } from 'fp-ts/lib/function'
import { NodeVisitor } from 'simple-ts-transform'
import ts, {
  ExpressionStatement,
  isExpressionStatement,
  isIdentifier,
  isTaggedTemplateExpression,
  Node,
  SyntaxKind,
  TaggedTemplateExpression,
} from 'typescript'
import { CSTVisitor, parser, tokenize } from '../compiler'
import { Context } from './Context'
import * as E from 'fp-ts/lib/Either'

export class MacroVisitor implements NodeVisitor<ExpressionStatement> {
  public constructor(private readonly context: Context) {}

  public wants(node: Node): node is ExpressionStatement {
    return isExpressionStatement(node)
  }

  public visit(node: ExpressionStatement): Node[] {
    const { defineMacroIdents, factory } = this.context

    if (node.getChildCount() == 0) {
      return [node]
    }

    const taggedTemplateExpression = node.getChildAt(0)
    if (!isTaggedTemplateExpression(taggedTemplateExpression)) {
      return [node]
    }

    const { tag, template } = taggedTemplateExpression

    if (!isIdentifier(tag) || !defineMacroIdents.has(tag.text)) {
      return [node]
    }

    switch (template.kind) {
      case SyntaxKind.NoSubstitutionTemplateLiteral: {
        const tokenizeResult = tokenize(template.text)
        if (E.isLeft(tokenizeResult)) {
          console.error(tokenizeResult.left)
          process.exit(1)
        }

        const { tokens } = tokenizeResult.right
        parser.input = tokens

        const parserResult = parser.parseCST()
        if (E.isLeft(parserResult)) {
          console.error(parserResult.left)
          process.exit(1)
        }

        const cstNode = parserResult.right

        const cstVisitor = new CSTVisitor(factory)
        // if this typecast fails the compiler will fail as well
        const astResult = cstVisitor.visit(cstNode) as E.Either<unknown, Node>
        if (E.isLeft(astResult)) {
          console.error(astResult.left)
          process.exit(1)
        }

        const ast = astResult.right

        return [ast]
      }

      case SyntaxKind.TemplateExpression:
        // no-op because defineMacro only takes one parameter
        break
      default:
        break
    }

    return [factory.createEmptyStatement()]
  }
}
