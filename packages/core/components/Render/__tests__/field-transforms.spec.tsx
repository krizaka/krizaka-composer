import { renderToString } from "react-dom/server.node";
import { Config, Data, DefaultComponents } from "../../../types";

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

import { Render } from "../index";

describe("Render fieldTransforms", () => {
  const config: Config = {
    root: {
      fields: {
        title: { type: "text" },
        hero: { type: "slot" },
      },
      render: ({ title, hero, children }: any) => {
        const Hero = hero;

        return (
          <main>
            <span>{title}</span>
            {typeof Hero === "function" ? <Hero /> : null}
            {children}
          </main>
        );
      },
    },
    components: {
      Section: {
        fields: { items: { type: "slot" } },
        render: ({ items }: any) => {
          const Items = items;

          return (
            <section>{typeof Items === "function" ? <Items /> : null}</section>
          );
        },
      },
      Heading: {
        fields: { title: { type: "text" } },
        render: ({ title }: any) => <h2>{title}</h2>,
      },
    },
  };

  const data: Data<DefaultComponents, any> = {
    root: {
      props: {
        title: "Root title",
        hero: [
          {
            type: "Heading",
            props: { id: "in-root-slot", title: "In root slot" },
          },
        ],
      },
    },
    content: [
      {
        type: "Section",
        props: {
          id: "section-1",
          items: [
            {
              type: "Heading",
              props: { id: "in-nested-slot", title: "In nested slot" },
            },
          ],
        },
      },
    ],
  };

  it("leaves props untouched when no fieldTransforms are given", () => {
    const html = renderToString(<Render config={config} data={data} />);

    expect(html).toContain("<span>Root title</span>");
    expect(html).toContain("<h2>In root slot</h2>");
    expect(html).toContain("<h2>In nested slot</h2>");
    expect(html).not.toContain("<mark>");
  });

  it("applies a transform to root props and to children at every depth", () => {
    const html = renderToString(
      <Render
        config={config}
        data={data}
        fieldTransforms={{
          text: ({ value }) => <mark>{value}</mark>,
        }}
      />
    );

    expect(html).toContain("<span><mark>Root title</mark></span>");
    expect(html).toContain("<h2><mark>In root slot</mark></h2>");
    expect(html).toContain("<h2><mark>In nested slot</mark></h2>");
  });

  // Render returns from a different branch when the config has no root render,
  // which is easy to miss when threading transforms down to the dropzones.
  it("applies a transform when the config has no root render", () => {
    const configWithoutRootRender: Config = {
      components: {
        Heading: {
          fields: { title: { type: "text" } },
          render: ({ title }: any) => <h2>{title}</h2>,
        },
      },
    };

    const html = renderToString(
      <Render
        config={configWithoutRootRender}
        data={{
          root: { props: {} },
          content: [
            { type: "Heading", props: { id: "h1", title: "Top level" } },
          ],
        }}
        fieldTransforms={{ text: ({ value }) => <mark>{value}</mark> }}
      />
    );

    expect(html).toContain("<h2><mark>Top level</mark></h2>");
  });
});
