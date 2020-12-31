import type { NodeVisitor } from 'simple-ts-transform'
import {
  Identifier,
  ImportDeclaration,
  ImportSpecifier,
  isImportDeclaration,
  isStringLiteral,
  Node,
  SyntaxKind,
} from 'typescript'
import type { Context } from './Context'

const MODULE_NAME = '@sanity-ts/typescript-macros'
const DEFINE_MACRO = 'defineMacro'

/**
 * Visits each import declaration to check if the file contains the macro import
 * for this library. If so, adds the import identifier to the context.
 */
export class ImportDeclarationVisitor
  implements NodeVisitor<ImportDeclaration> {
  public constructor(private readonly context: Context) {}

  public wants(node: Node): node is ImportDeclaration {
    return isImportDeclaration(node)
  }

  public visit(node: ImportDeclaration): Node[] {
    this.assignDefineMacroIdentifiers(node)

    return [node]
  }

  private assignDefineMacroIdentifiers(node: ImportDeclaration): void {
    if (!importOriginatesFromThisModule(node)) {
      return
    }

    const namedBindings = node.importClause?.namedBindings

    switch (namedBindings?.kind) {
      case SyntaxKind.NamedImports:
        for (const importSpecifier of namedBindings.elements) {
          this.assignDefineMacroIdentifier(importSpecifier)
        }
        break
      default:
        break
    }
  }

  private assignDefineMacroIdentifier(importSpecifier: ImportSpecifier) {
    const { defineMacroIdents } = this.context

    if (
      isRenamedImport(importSpecifier) &&
      importSpecifier.propertyName.text == DEFINE_MACRO
    ) {
      defineMacroIdents.add(importSpecifier.name.text)
    } else if (importSpecifier.name.text == DEFINE_MACRO) {
      defineMacroIdents.add(DEFINE_MACRO)
    }
  }
}

function isRenamedImport(
  importSpecifier: ImportSpecifier,
): importSpecifier is ImportSpecifier & { propertyName: Identifier } {
  return !!importSpecifier.propertyName
}

function importOriginatesFromThisModule(node: ImportDeclaration) {
  return (
    isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text == MODULE_NAME
  )
}
