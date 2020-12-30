import type { NodeVisitorContext } from 'simple-ts-transform'
import type {
  NodeFactory,
  Program,
  SourceFile,
  TransformationContext,
} from 'typescript'
import * as D from 'io-ts/lib/Decoder'
import * as E from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'

const Configuration = D.type({
  isDeclarationTransformer: D.boolean,
})

export type Configuration = D.TypeOf<typeof Configuration>

export class Context implements NodeVisitorContext {
  public readonly basePath: string
  public factory!: NodeFactory
  public fileName!: string
  public readonly defineMacroIdents: Set<string>
  public readonly isDeclarationTransformer: boolean

  public constructor(program: Program, public readonly configuration: unknown) {
    this.basePath =
      program.getCompilerOptions().rootDir || program.getCurrentDirectory()
    this.defineMacroIdents = new Set()

    this.isDeclarationTransformer = pipe(
      Configuration.decode(configuration),
      E.fold(
        () => false,
        ({ isDeclarationTransformer }) => isDeclarationTransformer,
      ),
    )
  }

  public initNewFile(
    context: TransformationContext,
    sourceFile: SourceFile,
  ): void {
    this.defineMacroIdents.clear()
    this.factory = context.factory
    this.fileName = sourceFile.fileName
  }
}
