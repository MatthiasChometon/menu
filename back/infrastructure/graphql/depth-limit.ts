import {
  GraphQLError,
  Kind,
  type DocumentNode,
  type FragmentDefinitionNode,
  type OperationDefinitionNode,
  type SelectionNode,
  type ValidationRule,
} from 'graphql';

// The schema is flat today, but a validation rule is what keeps it safe as it
// grows: without one, a single nested query is enough to keep the process busy
// for as long as the attacker cares to type.
export const depthLimit =
  (maximum: number): ValidationRule =>
  (context) => {
    const depthOfSelections = selectionDepthMeasurer(context.getDocument());

    return {
      OperationDefinition(operation: OperationDefinitionNode): void {
        const depth = 1 + depthOfSelections(operation.selectionSet.selections);
        if (depth > maximum) {
          context.reportError(
            new GraphQLError(`Query is too deeply nested (${depth} levels, maximum ${maximum}).`, {
              nodes: [operation],
            }),
          );
        }
      },
    };
  };

// A fragment spread is followed into its definition, otherwise a query could
// hide any depth behind one. Each fragment is measured once per document: a
// chain of fragments that each spread the previous one twice is a few hundred
// bytes of query and would otherwise cost two to the power of its length.
// A cycle is invalid GraphQL (another rule reports it) but this rule can run
// first, so a fragment already being measured counts as flat.
const selectionDepthMeasurer = (
  document: DocumentNode,
): ((selections: readonly SelectionNode[]) => number) => {
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragments.set(definition.name.value, definition);
    }
  }
  const measured = new Map<string, number>();
  const measuring = new Set<string>();

  const depthOfFragment = (name: string): number => {
    const known = measured.get(name);
    const fragment = fragments.get(name);
    if (known !== undefined) return known;
    if (fragment === undefined || measuring.has(name)) return 0;

    measuring.add(name);
    const depth = depthOfSelections(fragment.selectionSet.selections);
    measuring.delete(name);
    measured.set(name, depth);

    return depth;
  };

  const depthOfSelections = (selections: readonly SelectionNode[]): number =>
    Math.max(
      0,
      ...selections.map((selection): number => {
        if (selection.kind === Kind.FRAGMENT_SPREAD) return depthOfFragment(selection.name.value);
        // Inline fragments are transparent, as in execution: they add no level.
        if (selection.kind === Kind.INLINE_FRAGMENT) {
          return depthOfSelections(selection.selectionSet.selections);
        }
        if (selection.selectionSet === undefined) return 0;

        return 1 + depthOfSelections(selection.selectionSet.selections);
      }),
    );

  return depthOfSelections;
};
