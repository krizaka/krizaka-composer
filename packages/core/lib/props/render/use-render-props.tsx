// This file should avoid importing any non RSC friendly code (state, effects, context, etc.), as it is used in both RSC and CSR contexts.
import { ReactNode } from "react";

import {
  ComponentData,
  Config,
  Content,
  RootData,
  FieldTransforms,
} from "../../../types";
import { DropZoneProps } from "../../../components/DropZone/types";

import { useFieldTransforms } from "../../field-transforms/use-field-transforms";
import { getSlotTransform } from "../../field-transforms/default-transforms/slot-transform";

/**
 * Returns the transformed props for a component to use in rendered pages, applying all relevant field transforms (slots, inline text, etc.).
 *
 * @param config The Puck config used to build the item.
 * @param component The component or root data to resolve props for as it comes from the JSON data.
 * @param renderSlot A function that converts slot props to a ReactNode.
 * @param fieldTransforms User or additional field transforms to apply while rendering the final page props.
 * @returns The props for the item, with slot props converted to ReactNodes and any field transforms applied.
 */
function useRenderProps<
  T extends ComponentData | RootData,
  UserConfig extends Config
>(
  config: UserConfig,
  component: T,
  renderSlot: (dzProps: DropZoneProps & { content: Content }) => ReactNode,
  fieldTransforms?: FieldTransforms
): T["props"] {
  // Apply all transforms
  const transformedProps: T["props"] = useFieldTransforms(
    config,
    component as ComponentData,
    { ...getSlotTransform(renderSlot), ...fieldTransforms },
    undefined,
    true
  );

  return transformedProps;
}

export default useRenderProps;
