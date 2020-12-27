import type { NodeVisitorContext } from 'simple-ts-transform'
import type {
  NodeFactory,
  Program,
  SourceFile,
  TransformationContext,
} from 'typescript'

export class Context implements NodeVisitorContext {
  public readonly basePath: string
  public factory!: NodeFactory
  public fileName!: string
  public readonly defineMacroIdents: Set<string>

  public constructor(
    program: Program,
    public readonly _configuration: unknown,
  ) {
    this.basePath =
      program.getCompilerOptions().rootDir || program.getCurrentDirectory()
    this.defineMacroIdents = new Set()
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
