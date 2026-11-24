import {
  GraphQLError,
  Kind,
  type FragmentDefinitionNode,
  type OperationDefinitionNode,
  type SelectionNode,
  type ValidationRule,
} from 'graphql';

type Fragments = Map<string, FragmentDefinitionNode>;

// The schema is flat today, but a validation rule is what keeps it safe as it
// grows: without one, a single nested query is enough to keep the process busy
// for as long as the attacker cares to type.
export const depthLimit =
  (maximum: number): ValidationRule =>
  (context) => {
    const fragments: Fragments = new Map(
      context
        .getDocument()
        .definitions.filter(
          (definition): definition is FragmentDefinitionNode =>
            definition.kind === Kind.FRAGMENT_DEFINITION,
        )
        .map((definition) => [definition.name.value, definition]),
    );

    return {
      OperationDefinition(operation: OperationDefinitionNode): void {
        const depth =
          1 + depthOfSelections(operation.selectionSet.selections, fragments, new Set());
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
// hide any depth behind one. `followed` holds the fragments being walked on the
// current path: a cycle is invalid GraphQL (another rule reports it) but this
// rule can run first, so it must not recurse forever.
const depthOfSelections = (
  selections: readonly SelectionNode[],
  fragments: Fragments,
  followed: ReadonlySet<string>,
): number => {
  const depths = selections.map((selection): number => {
    if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const name = selection.name.value;
      const fragment = fragments.get(name);
      if (fragment === undefined || followed.has(name)) return 0;

      return depthOfSelections(
        fragment.selectionSet.selections,
        fragments,
        new Set(followed).add(name),
      );
    }

    // Inline fragments are transparent, as in execution: they add no level.
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      return depthOfSelections(selection.selectionSet.selections, fragments, followed);
    }

    if (selection.selectionSet === undefined) return 0;

    return 1 + depthOfSelections(selection.selectionSet.selections, fragments, followed);
  });

  return Math.max(0, ...depths);
};
