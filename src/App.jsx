import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";

function CollapsibleTreeContent({ data, width, height }) {
  const margin = {
    top: 50,
    right: 250,
    bottom: 50,
    left: 50,
  };
  const [collapsed, setCollapsed] = useState({});
  useEffect(() => {
    const newCollapsed = {};
    for (const item of data) {
      newCollapsed[item.id] = item.depth >= 2;
    }
    setCollapsed(newCollapsed);
  }, [data]);
  const [nodes, links] = useMemo(() => {
    const stratify = d3.stratify();
    const root = d3.hierarchy(stratify(data), (item) =>
      collapsed[item.id] ? null : item.children
    );
    const tree = d3
      .tree()
      .size([
        height - margin.top - margin.bottom,
        width - margin.left - margin.right,
      ]);
    tree(root);
    const nodes = root.descendants().map((item) => {
      return { ...item.data.data, y: item.x, x: item.y };
    });
    const nodeIndices = {};
    nodes.forEach((node, i) => {
      nodeIndices[node.id] = i;
    });
    const links = root.links().map(({ source, target }) => {
      return {
        source: nodeIndices[source.data.data.id],
        target: nodeIndices[target.data.data.id],
      };
    });
    return [nodes, links];
  }, [data, width, height, margin]);
  return (
    <svg className="collapsible-tree" width={width} height={height}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <g>
          {links.map((link) => {
            const line = d3.line().curve(d3.curveBumpX);
            const points = [link.source, link.target].map((i) => [
              nodes[i].x,
              nodes[i].y,
            ]);
            return (
              <g
                key={`${nodes[link.source].id}:${nodes[link.target].id}`}
                className="link"
              >
                <path d={line(points)} fill="none" stroke="#444" />
              </g>
            );
          })}
        </g>
        <g>
          {nodes.map((node) => {
            return (
              <g
                key={node.id}
                className={node.childCount > 0 ? "node clickable" : "node"}
                transform={`translate(${node.x},${node.y})`}
                onClick={() => {
                  setCollapsed({
                    ...collapsed,
                    [node.id]: !collapsed[node.id],
                  });
                }}
              >
                <circle
                  r="5"
                  fill={
                    collapsed[node.id] && node.childCount > 0 ? "#c00" : "#444"
                  }
                />
                <text
                  x="8"
                  textAnchor="begin"
                  dominantBaseline="central"
                  fontSize="14"
                  fontWeight="bold"
                  transform="rotate(-30)"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}

function CollapsibleTree({ data }) {
  const wrapperRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setSize({
        width: wrapperRef.current.clientWidth,
        height: wrapperRef.current.clientHeight,
      });
    });
    observer.observe(wrapperRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="collapsible-tree-wrapper">
      {data && (
        <CollapsibleTreeContent
          data={data}
          width={size.width}
          height={size.height}
        />
      )}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      const response = await fetch("flare.csv");
      const data = d3.csvParse(await response.text());
      for (const item of data) {
        const segments = item.id.split(".");
        item.name = segments[segments.length - 1];
        item.parentId = segments.slice(0, -1).join(".") || null;
        item.value = +item.value || null;
      }
      const stratify = d3.stratify();
      setData(
        stratify(data)
          .descendants()
          .map((item) => {
            return {
              ...item.data,
              height: item.height,
              depth: item.depth,
              childCount: item.children?.length || 0,
            };
          })
      );
    })();
  }, []);
  return <CollapsibleTree data={data} />;
}
