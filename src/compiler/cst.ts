/// CST Types based off of the parser module
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray'
import { CstNode, IToken } from 'chevrotain'

export type NamespaceExpression = {
  Namespace: NonEmptyArray<IToken>
  Identifier: NonEmptyArray<IToken>
  LeftBracket: NonEmptyArray<IToken>
  classDeclaration: CstNode[]
  RightBracket: NonEmptyArray<IToken>
}

export type ClassDeclaration = {
  decoratorExpression?: CstNode[]
  Identifier: NonEmptyArray<IToken>
  structExpression?: CstNode[]
  tupleExpression?: CstNode[]
}

export type DecoratorExpression = {
  At: NonEmptyArray<IToken>
  Identifier: NonEmptyArray<IToken>
  callExpression?: CstNode[]
}

export type CallExpression = {
  Identifier: NonEmptyArray<IToken>
}

export type StructExpression = {
  LeftBracket: NonEmptyArray<IToken>
  kvPair: CstNode[]
  RightBracket: NonEmptyArray<IToken>
}

export type KvPair = {
  Identifier: NonEmptyArray<IToken>
  Colon: NonEmptyArray<IToken>
}
