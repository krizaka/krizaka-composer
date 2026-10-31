import { renderToString } from "react-dom/server.node";
import { Config, Data } from "../../../types";
import { Render } from "../index";

describe("ServerRender", () => {
  it("forwards additional props to the element provided via `as`", () => {
    const config: Config = {
      components: {
        Section: {
          fields: {
            content: { type: "slot" },
          },
          render: ({ content: Content }) => (
            <Content as="section" id="my-slot" data-custom="foo" />
          ),
        },
        Heading: {
          fields: { title: { type: "text" } },
          render: ({ title }) => <h2>{title}</h2>,
        },
      },
    };

    const data: Data = {
      root: { props: {} },
      content: [
        {
          type: "Section",
          props: {
            id: "section-1",
            content: [
              { type: "Heading", props: { id: "heading-1", title: "Hello" } },
            ],
          },
        },
      ],
    };

    const html = renderToString(<Render config={config} data={data} />);

    expect(html).toContain("<section");
    expect(html).toContain('id="my-slot"');
    expect(html).toContain('data-custom="foo"');
    expect(html).toContain("<h2>Hello</h2>");
    // Puck-internal props should not leak onto the element
    expect(html).not.toContain('zone="');
  });

  it("strips `children` and `dangerouslySetInnerHTML` before forwarding to `as`", () => {
    const configWithDangerousSetHTML: Config = {
      components: {
        Section: {
          fields: {
            content: { type: "slot" },
          },
          render: ({ content: Content }) => (
            <Content
              as="section"
              dangerouslySetInnerHTML={{ __html: "<em>injected</em>" }}
            />
          ),
        },
        Heading: {
          fields: { title: { type: "text" } },
          render: ({ title }) => <h2>{title}</h2>,
        },
      },
    };

    const configWithChildren: Config = {
      components: {
        Section: {
          fields: {
            content: { type: "slot" },
          },
          render: ({ content: Content }) => (
            <Content as="section">Rogue child</Content>
          ),
        },
        Heading: {
          fields: { title: { type: "text" } },
          render: ({ title }) => <h2>{title}</h2>,
        },
      },
    };

    const data: Data = {
      root: { props: {} },
      content: [
        {
          type: "Section",
          props: {
            id: "section-1",
            content: [
              { type: "Heading", props: { id: "heading-1", title: "Hello" } },
            ],
          },
        },
      ],
    };

    // Without the runtime strip this throws: React refuses to render an
    // element with both children and dangerouslySetInnerHTML
    const htmlWithDangerousSetHTML = renderToString(
      <Render config={configWithDangerousSetHTML} data={data} />
    );
    const htmlWithChildren = renderToString(
      <Render config={configWithChildren} data={data} />
    );

    expect(htmlWithDangerousSetHTML).toContain("<h2>Hello</h2>");
    expect(htmlWithDangerousSetHTML).not.toContain("injected");

    expect(htmlWithChildren).toContain("<h2>Hello</h2>");
    expect(htmlWithChildren).not.toContain("Rogue child");
  });
});
