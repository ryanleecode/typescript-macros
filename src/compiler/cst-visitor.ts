import {
  ClassDeclaration,
  DecoratorExpression,
  NamespaceExpression,
} from './cst'
import { Parser } from './parser'
import ts from 'typescript'
import * as E from 'fp-ts/lib/Either'
import * as A from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'

type Result<A> = E.Either<unknown, A>
type DecoratorExpressionResult = Result<{
  heritageClauses: ts.HeritageClause[]
  members: ts.ClassElement[]
}>

export class CSTVisitor extends Parser.BaseCstVisitorConstructorWithDefaults {
  private readonly factory: ts.NodeFactory

  constructor(factory: ts.NodeFactory) {
    super()
    this.validateVisitor()

    this.factory = factory
  }

  namespaceExpression = (
    ctx: NamespaceExpression,
  ): E.Either<unknown, ts.ModuleDeclaration> => {
    const { factory } = this

    const decorators: ts.Decorator[] | undefined = undefined
    const modifiers: ts.Modifier[] = [
      factory.createModifier(ts.SyntaxKind.ExportKeyword),
    ]
    const moduleName = factory.createIdentifier(ctx.Identifier[0].image)

    return pipe(
      E.bindTo('moduleStatements')(
        A.array.sequence(E.either)(
          ctx.classDeclaration.map(
            (classDeclaration): Result<ts.Statement> =>
              this.visit(classDeclaration),
          ),
        ),
      ),
      E.map(({ moduleStatements }) =>
        factory.createModuleDeclaration(
          decorators,
          modifiers,
          moduleName,
          factory.createModuleBlock(moduleStatements),
          ts.NodeFlags.Namespace,
        ),
      ),
    )
  }

  classDeclaration(
    ctx: ClassDeclaration,
  ): E.Either<unknown, ts.ClassDeclaration> {
    const { factory } = this

    const decorators: ts.Decorator[] | undefined = undefined
    const modifiers: ts.Modifier[] = [
      factory.createModifier(ts.SyntaxKind.ExportKeyword),
    ]
    const className = ctx.Identifier[0].image
    const typeParameters: ts.TypeParameterDeclaration[] = []

    return pipe(
      E.bindTo('decoratorTokens')(
        A.array.sequence(E.either)(
          (ctx.decoratorExpression || []).map(
            (decoratorExpression): DecoratorExpressionResult =>
              this.visit(decoratorExpression, className),
          ),
        ),
      ),
      E.bind('heritageClauses', ({ decoratorTokens }) =>
        E.right(
          pipe(
            A.array.map(
              decoratorTokens,
              ({ heritageClauses }) => heritageClauses,
            ),
            A.flatten,
          ),
        ),
      ),
      E.bind('members', ({ decoratorTokens }) =>
        E.right(
          pipe(
            A.array.map(decoratorTokens, ({ members }) => members),
            A.flatten,
          ),
        ),
      ),
      E.map(({ heritageClauses, members }) =>
        factory.createClassDeclaration(
          decorators,
          modifiers,
          className,
          typeParameters,
          heritageClauses,
          members,
        ),
      ),
    )
  }

  decoratorExpression(
    ctx: DecoratorExpression,
    className: string,
  ): DecoratorExpressionResult {
    const { factory } = this

    const decorator = ctx.Identifier[0].image

    switch (decorator) {
      case 'error':
        return E.right({
          heritageClauses: [
            factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
              factory.createExpressionWithTypeArguments(
                factory.createIdentifier('Error'),
                undefined,
              ),
            ]),
          ],
          members: [
            this.factory.createPropertyDeclaration(
              undefined,
              [factory.createModifier(ts.SyntaxKind.PublicKeyword)],
              factory.createIdentifier('_type'),
              undefined,
              factory.createLiteralTypeNode(
                factory.createStringLiteral(className),
              ),
              undefined,
            ),
            factory.createConstructorDeclaration(
              undefined,
              undefined,
              [],
              factory.createBlock(
                [
                  factory.createExpressionStatement(
                    factory.createCallExpression(
                      factory.createSuper(),
                      undefined,
                      [factory.createStringLiteral('')],
                    ),
                  ),
                  factory.createExpressionStatement(
                    factory.createBinaryExpression(
                      factory.createPropertyAccessExpression(
                        factory.createThis(),
                        factory.createIdentifier('_type'),
                      ),
                      factory.createToken(ts.SyntaxKind.EqualsToken),
                      factory.createStringLiteral(className),
                    ),
                  ),
                ],
                true,
              ),
            ),
          ],
        })
      default:
        // todo add error diagnostic for unrecognized decorator
        return E.right({ heritageClauses: [], members: [] })
    }
  }
}
