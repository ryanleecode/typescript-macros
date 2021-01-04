import {
  ClassDeclaration,
  DecoratorExpression,
  KvPair,
  NamespaceExpression,
  StructExpression,
} from './cst'
import { Parser } from './parser'
import ts from 'typescript'
import * as E from 'fp-ts/lib/Either'
import * as A from 'fp-ts/lib/Array'
import * as O from 'fp-ts/lib/Option'
import { identity, pipe } from 'fp-ts/lib/function'
import { ReadonlyRecord } from 'fp-ts/lib/ReadonlyRecord'

type Result<A> = E.Either<unknown, A>

type ClassDeclarationDescriptor = {
  readonly baseClass?: string
  readonly className: string
  readonly structFields: ReadonlyRecord<string, string>
}

export class CSTVisitor extends Parser.BaseCstVisitorConstructor {
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
        pipe(
          A.array.sequence(E.either)(
            ctx.classDeclaration.map(
              (classDeclaration): Result<ts.Statement[]> =>
                this.visit(classDeclaration),
            ),
          ),
          E.map(A.flatten),
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

  classDeclaration(ctx: ClassDeclaration): E.Either<unknown, ts.Statement[]> {
    const { factory } = this

    const className = ctx.Identifier[0].image

    const baseDescriptor: ClassDeclarationDescriptor = {
      className,
      structFields: {},
    }

    return pipe(
      A.array.sequence(E.either)(
        (ctx.decoratorExpression || []).map(
          (decoratorExpression): Result<ClassDeclarationDescriptor> =>
            this.visit(decoratorExpression, baseDescriptor),
        ),
      ),
      E.map(A.reduce(baseDescriptor, (x, y) => ({ ...x, ...y }))),
      E.chain((descriptor) =>
        pipe(
          A.array.sequence(E.either)(
            (ctx.structExpression || []).map(
              (structExpression): Result<ClassDeclarationDescriptor> =>
                this.visit(structExpression, descriptor),
            ),
          ),
          E.map(A.reduce(descriptor, (x, y) => ({ ...x, ...y }))),
        ),
      ),
      E.map((descriptor) => {
        const decorators: ts.Decorator[] | undefined = undefined
        const modifiers: ts.Modifier[] = [
          factory.createModifier(ts.SyntaxKind.ExportKeyword),
        ]
        const typeParameters: ts.TypeParameter[] | undefined = undefined
        const heritageClauses = pipe(
          O.fromNullable(descriptor.baseClass),
          O.map((baseClass) => [
            factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
              factory.createExpressionWithTypeArguments(
                factory.createIdentifier(baseClass),
                undefined,
              ),
            ]),
          ]),
          O.fold(() => [], identity),
        )

        const members: ts.ClassElement[] = []
        const constructorStatements: ts.ExpressionStatement[] = []
        const parameterDeclarations: ts.ParameterDeclaration[] = []
        const interfaces: ts.InterfaceDeclaration[] = []

        if (descriptor.baseClass) {
          switch (descriptor.baseClass) {
            case Error.name:
              constructorStatements.push(
                factory.createExpressionStatement(
                  factory.createCallExpression(
                    factory.createSuper(),
                    undefined,
                    [factory.createStringLiteral('')],
                  ),
                ),
              )
              break
            default:
              break
          }
        }

        // add _type parameter
        members.push(
          factory.createPropertyDeclaration(
            undefined,
            [
              factory.createModifier(ts.SyntaxKind.PublicKeyword),
              factory.createModifier(ts.SyntaxKind.ReadonlyKeyword),
            ],
            factory.createIdentifier('_type'),
            undefined,
            factory.createLiteralTypeNode(
              factory.createStringLiteral(descriptor.className),
            ),
            undefined,
          ),
        )
        constructorStatements.push(
          factory.createExpressionStatement(
            factory.createBinaryExpression(
              factory.createPropertyAccessExpression(
                factory.createThis(),
                factory.createIdentifier('_type'),
              ),
              factory.createToken(ts.SyntaxKind.EqualsToken),
              factory.createStringLiteral(descriptor.className),
            ),
          ),
        )

        // add struct fields
        const structFieldsEntries = Object.entries(descriptor.structFields)
        for (const [fieldName, type] of structFieldsEntries) {
          members.push(
            factory.createPropertyDeclaration(
              undefined,
              [
                factory.createModifier(ts.SyntaxKind.PublicKeyword),
                factory.createModifier(ts.SyntaxKind.ReadonlyKeyword),
              ],
              factory.createIdentifier(fieldName),
              undefined,
              factory.createTypeReferenceNode(
                factory.createIdentifier(type),
                undefined,
              ),
              undefined,
            ),
          )
          constructorStatements.push(
            factory.createExpressionStatement(
              factory.createBinaryExpression(
                factory.createPropertyAccessExpression(
                  factory.createThis(),
                  factory.createIdentifier(fieldName),
                ),
                factory.createToken(ts.SyntaxKind.EqualsToken),
                factory.createIdentifier(fieldName),
              ),
            ),
          )
        }

        // Add struct fields to constructor
        if (structFieldsEntries.length > 0) {
          const interfaceArgsIdent = factory.createIdentifier(
            `${className}Args`,
          )
          interfaces.push(
            factory.createInterfaceDeclaration(
              undefined,
              [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
              interfaceArgsIdent,
              undefined,
              undefined,
              structFieldsEntries.map(([fieldName, type]) =>
                factory.createPropertySignature(
                  undefined,
                  factory.createIdentifier(fieldName),
                  undefined,
                  factory.createTypeReferenceNode(
                    factory.createIdentifier(type),
                    undefined,
                  ),
                ),
              ),
            ),
          )
          parameterDeclarations.push(
            factory.createParameterDeclaration(
              undefined,
              undefined,
              undefined,
              factory.createObjectBindingPattern(
                structFieldsEntries.map(([fieldName, _]) =>
                  factory.createBindingElement(
                    undefined,
                    undefined,
                    factory.createIdentifier(fieldName),
                    undefined,
                  ),
                ),
              ),
              undefined,
              factory.createTypeReferenceNode(interfaceArgsIdent, undefined),
              undefined,
            ),
          )
        }

        // add constructor
        members.push(
          factory.createConstructorDeclaration(
            undefined,
            [],
            parameterDeclarations,
            factory.createBlock(constructorStatements, true),
          ),
        )

        return A.flatten([
          interfaces as ts.Statement[],
          [
            factory.createClassDeclaration(
              decorators,
              modifiers,
              className,
              typeParameters,
              heritageClauses,
              members,
            ),
          ] as ts.Statement[],
        ])
      }),
    )
  }

  callExpression() {}

  decoratorExpression(
    ctx: DecoratorExpression,
    descriptor: ClassDeclarationDescriptor,
  ): Result<ClassDeclarationDescriptor> {
    const decorator = ctx.Identifier[0].image

    switch (decorator) {
      case 'error':
        return E.right({ ...descriptor, baseClass: Error.name })
      default:
        // todo add error diagnostic for unrecognized decorator
        return E.right(descriptor)
    }
  }

  structExpression(
    ctx: StructExpression,
    descriptor: ClassDeclarationDescriptor,
  ): Result<ClassDeclarationDescriptor> {
    return pipe(
      A.array.sequence(E.either)(
        (ctx.kvPair || []).map(
          (kvPairs): Result<ClassDeclarationDescriptor> =>
            this.visit(kvPairs, descriptor),
        ),
      ),
      E.map(
        A.reduce(descriptor, (b, a) => ({
          ...b,
          ...a,
          structFields: {
            ...b.structFields,
            ...a.structFields,
          },
        })),
      ),
    )
  }

  kvPair(
    ctx: KvPair,
    descriptor: ClassDeclarationDescriptor,
  ): Result<ClassDeclarationDescriptor> {
    const fieldName = ctx.Identifier[0].image
    const type = ctx.Identifier[1]?.image ?? 'unknown'

    return E.right({
      ...descriptor,
      structFields: {
        ...descriptor.structFields,
        [fieldName]: type,
      },
    })
  }

  tupleExpression() {}
}
