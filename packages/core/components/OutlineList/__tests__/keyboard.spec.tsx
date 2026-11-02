import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { OutlineList } from "..";

jest.mock("../styles.module.css");

// Sonar S1082, S6845: a clickable item is a native button, so the keyboard
// reaches and operates it without a role or a tabindex.
describe("OutlineList.Item keyboard", () => {
  it("is a native button: focusable, and the browser turns Enter and Space into a click", () => {
    const onClick = jest.fn();
    render(
      <OutlineList>
        <OutlineList.Item onClick={onClick}>Heading</OutlineList.Item>
      </OutlineList>
    );
    const button = screen.getByRole("button", { name: "Heading" });
    expect(button.tagName).toBe("BUTTON");

    expect(button).not.toHaveAttribute("tabindex");
    expect(button).not.toBeDisabled();
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is not a control without a handler", () => {
    render(
      <OutlineList>
        <OutlineList.Item>Plain</OutlineList.Item>
      </OutlineList>
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Plain").closest("li")).not.toHaveAttribute(
      "tabindex"
    );
  });
});
