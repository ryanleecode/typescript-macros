import ts from 'typescript'
import { Command } from '@oclif/command'
import * as path from 'path'
import transformer from '..'
import * as tsMorph from 'ts-morph'
import prettier from 'prettier'

export default class Generate extends Command {
  static description = 'Generates the typings for macros'

  async run() {
    const tsConfigPath = ts.findConfigFile(
      './',
      ts.sys.fileExists,
      'tsconfig.json',
    )

    const project = new tsMorph.Project({ tsConfigFilePath: tsConfigPath })
    const program = project.getProgram()

    const isInTypesFolder = (sourceFile: tsMorph.SourceFile) =>
      path.dirname(sourceFile.getFilePath()).match(/@types$/)

    const outputFiles = project
      .getSourceFiles()
      .filter((sourcefile) => !sourcefile.isDeclarationFile())
      .filter((sourceFile) => !isInTypesFolder(sourceFile))
      .map((sourceFile) => {
        const configuration = {
          rootNodeForDeclarations: undefined,
        }

        const transformResult = ts.transform(sourceFile.compilerNode, [
          transformer(program.compilerObject, configuration),
        ])

        const transformed = transformResult.transformed[0]!

        const outputDirectory = path.dirname(sourceFile.getFilePath())
        const outputPath = path.join(
          outputDirectory,
          '@types',
          path.basename(sourceFile.getFilePath()),
        )

        const outputFile = sourceFile.copy(outputPath, { overwrite: true })

        return outputFile.transform(() => transformed)
      })

    for (const outputFile of outputFiles) {
      const declaration = project
        .emitToMemory({
          targetSourceFile: outputFile,
          emitOnlyDtsFiles: true,
        })
        .getFiles()[0]!
      declaration.text = declaration.text.replace(/^export\s*/, '')
      declaration.text = prettier.format(declaration.text, {
        parser: 'babel-ts',
      })

      project.createSourceFile(outputFile.getFilePath(), declaration.text, {
        overwrite: true,
      })
    }

    await project.save()
  }
}
