import { CSSProperties, ReactElement, ReactNode } from "react";
import { DefaultComponentProps, FieldMetadata, UiState } from ".";

export type FieldGroupVariant = "flush" | "card";

type FieldOption = {
  label: string;
  value: string | number | boolean | undefined | null | object;
};

type FieldOptions = Array<FieldOption> | ReadonlyArray<FieldOption>;

export interface BaseField {
  label?: string;
  labelIcon?: ReactElement;
  metadata?: FieldMetadata;
  visible?: boolean;
}

export interface TextField extends BaseField {
  type: "text";
  placeholder?: string;
  contentEditable?: boolean;
}

export interface NumberField extends BaseField {
  type: "number";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface TextareaField extends BaseField {
  type: "textarea";
  placeholder?: string;
  contentEditable?: boolean;
}

export interface SelectField extends BaseField {
  type: "select";
  options: FieldOptions;
}

export interface RadioField extends BaseField {
  type: "radio";
  options: FieldOptions;
}

export interface CheckboxField extends BaseField {
  type: "checkbox";
  options: FieldOptions;
}

export interface ArrayField<
  Props extends { [key: string]: any }[] = { [key: string]: any }[],
  UserField extends {} = {}
> extends BaseField {
  type: "array";
  arrayFields: {
    [SubPropName in keyof Props[0]]: UserField extends { type: PropertyKey }
      ? Field<Props[0][SubPropName], UserField> | UserField
      : Field<Props[0][SubPropName], UserField>;
  };
  defaultItemProps?: Props[0] | ((index: number) => Props[0]);
  getItemSummary?: (item: Props[0], index?: number) => ReactNode;
  max?: number;
  min?: number;
}

export interface ObjectField<
  Props extends any = { [key: string]: any },
  UserField extends {} = {}
> extends BaseField {
  type: "object";
  collapsible?: boolean;
  defaultExpanded?: boolean;
  variant?: FieldGroupVariant;
  objectFields: {
    [SubPropName in keyof Props]: UserField extends { type: PropertyKey }
      ? Field<Props[SubPropName]> | UserField
      : Field<Props[SubPropName]>;
  };
}

export type CustomFieldRender<Value extends any> = (props: {
  field: CustomField<Value>;
  name: string;
  id: string;
  value: Value;
  onChange: (value: Value, uiState?: Partial<UiState>) => void;
  readOnly?: boolean;
}) => ReactElement;

export interface CustomField<Value extends any> extends BaseField {
  type: "custom";
  render: CustomFieldRender<Value>;
  contentEditable?: boolean;
  key?: string;
}

export interface SlotField extends BaseField {
  type: "slot";
  allow?: string[];
  disallow?: string[];
}

export type Field<ValueType = any, UserField extends {} = {}> =
  | TextField
  | NumberField
  | TextareaField
  | SelectField
  | RadioField
  | CheckboxField
  | ArrayField<
      ValueType extends { [key: string]: any }[] ? ValueType : never,
      UserField
    >
  | ObjectField<ValueType, UserField>
  | CustomField<ValueType>
  | SlotField;

export type Fields<
  ComponentProps extends DefaultComponentProps = DefaultComponentProps,
  UserField extends {} = {}
> = {
  [PropName in keyof Omit<ComponentProps, "editMode">]: UserField extends {
    type: PropertyKey;
  }
    ? Field<ComponentProps[PropName], UserField> | UserField
    : Field<ComponentProps[PropName]>;
};

export type FieldProps<F = Field<any>, ValueType = any> = {
  field: F;
  value: ValueType;
  id?: string;
  onChange: (value: ValueType, uiState?: Partial<UiState>) => void;
  readOnly?: boolean;
};
