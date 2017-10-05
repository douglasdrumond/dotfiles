<?php
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

namespace Microsoft\PhpParser;

use Microsoft\PhpParser\Node;

class DiagnosticsProvider {
    /**
     * Traverses AST to generate diagnostics.
     * @param \Microsoft\PhpParser\Node $node
     * @return \Generator | Diagnostic[]
     */

    private static $tokenKindToText;

    public static function checkDiagnostics($node) {
        if (!isset(self::$tokenKindToText)) {
            self::$tokenKindToText = \array_flip(\array_merge(
                TokenStringMaps::OPERATORS_AND_PUNCTUATORS,
                TokenStringMaps::KEYWORDS,
                TokenStringMaps::RESERVED_WORDS
            ));
        }

        if ($node instanceof SkippedToken) {
            // TODO - consider also attaching parse context information to skipped tokens
            // this would allow us to provide more helpful error messages that inform users what to do
            // about the problem rather than simply pointing out the mistake.
            return new Diagnostic(
                DiagnosticKind::Error,
                "Unexpected '" .
                (isset(self::$tokenKindToText[$node->kind])
                    ? self::$tokenKindToText[$node->kind]
                    : Token::getTokenKindNameFromValue($node->kind)) .
                "'",
                $node->start,
                $node->getEndPosition() - $node->start
            );
        } elseif ($node instanceof MissingToken) {
            return new Diagnostic(
                DiagnosticKind::Error,
                "'" .
                (isset(self::$tokenKindToText[$node->kind])
                    ? self::$tokenKindToText[$node->kind]
                    : Token::getTokenKindNameFromValue($node->kind)) .
                "' expected.",
                $node->start,
                $node->getEndPosition() - $node->start
            );
        }

        if ($node === null || $node instanceof Token) {
            return null;
        }

        if ($node instanceof Node) {
            if ($node instanceof Node\MethodDeclaration) {
                foreach ($node->modifiers as $modifier) {
                    if ($modifier->kind === TokenKind::VarKeyword) {
                        return new Diagnostic(
                            DiagnosticKind::Error,
                            "Unexpected modifier '" . self::$tokenKindToText[$modifier->kind] . "'",
                            $modifier->start,
                            $modifier->length
                        );
                    }
                }
            }
            elseif ($node instanceof Node\Statement\NamespaceUseDeclaration) {
                if (\count($node->useClauses->children) > 1) {
                    foreach ($node->useClauses->children as $useClause) {
                        if($useClause instanceof Node\NamespaceUseClause && !is_null($useClause->openBrace)) {
                            return new Diagnostic(
                                DiagnosticKind::Error,
                                "; expected.",
                                $useClause->getEndPosition(),
                                1
                            );
                        }
                    }
                }
            }
        }
        return null;
    }

    public static function getDiagnostics(Node $n) : array {
        $diagnostics = [];

        foreach ($n->getDescendantNodesAndTokens() as $node) {
            if (($diagnostic = self::checkDiagnostics($node)) !== null) {
                $diagnostics[] = $diagnostic;
            }
        }

        return $diagnostics;
    }
}
