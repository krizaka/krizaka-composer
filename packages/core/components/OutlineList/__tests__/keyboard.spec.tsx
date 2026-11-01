import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { OutlineList } from "..";

jest.mock("../styles.module.css");

// Sonar S1082: a clickable item answers the keyboard as it answers the pointer.
describe("OutlineList.Item keyboard", () => {
  it("activates on Enter and Space, and is focusable", () => {
    const onClick = jest.fn();
    render(
      <OutlineList>
        <OutlineList.Item onClick={onClick}>Heading</OutlineList.Item>
      </OutlineList>
    );
    const item = screen.getByText("Heading");
    expect(item).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(item, { key: "Enter" });
    fireEvent.keyDown(item, { key: " " });
    fireEvent.keyDown(item, { key: "a" });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("is not focusable without a handler", () => {
    render(
      <OutlineList>
        <OutlineList.Item>Plain</OutlineList.Item>
      </OutlineList>
    );
    expect(screen.getByText("Plain")).not.toHaveAttribute("tabindex");
  });
});
