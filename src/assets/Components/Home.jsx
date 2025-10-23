import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import rough from "roughjs/bundled/rough.esm.js";

const generator = rough.generator();

export default function Home() {
  // const [theme, setTheme] = useState(() => {
  //   return localStorage.getItem("theme") || "dark";
  // });
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [style, setStyle] = useState("stroke");
  const [color, setColor] = useState("#ffffff");
  const [tool, setTool] = useState("line");
  const [mouseMove, setMouseMove] = useState(false);
  const [elements, setElements] = useState(() => {
    const saved = localStorage.getItem("elements");
    return saved ? JSON.parse(saved) : [];
  });

  const elementRef = useRef([]);
  const drawingRef = useRef(false);
  const canvasRef = useRef(null);


  const createElement = useCallback(
    (
      x1,
      y1,
      x2,
      y2,
      points,
      type = tool,
      changeColor = color,
      drawStyle = style,
      width = strokeWidth
    ) => {
      let element;

      switch (type) {
        case "line":
          element = generator.line(x1, y1, x2, y2, {
            stroke: changeColor,
            strokeWidth: width,
            roughness: 1.7,
            bowing: 2,
          });
          return {
            x1,
            y1,
            x2,
            y2,
            element,
            type,
            color: changeColor,
            style: drawStyle,
            strokeWidth: width,
          };
        case "ellipse":
          element = generator.ellipse(
            (x1 + x2) / 2,
            (y1 + y2) / 2,
            Math.abs(x2 - x1),
            Math.abs(y2 - y1),
            {
              stroke: changeColor,
              strokeWidth: width,
              roughness: 1.7,
              bowing: 2,
              fill: drawStyle === "fill" ? changeColor : "none",
              fillStyle: drawStyle === "fill" ? "hachure" : undefined,
            }
          );
          return {
            x1,
            y1,
            x2,
            y2,
            element,
            type,
            color: changeColor,
            style: drawStyle,
            strokeWidth: width,
          };
        case "rectangle":
          element = generator.rectangle(
            Math.min(x1, x2),
            Math.min(y1, y2),
            Math.abs(x2 - x1),
            Math.abs(y2 - y1),
            {
              stroke: changeColor,
              strokeWidth: width,
              hachureGap: 8,
              hachureAngle: 60,
              roughness: 2.3,
              bowing: 1,
              fill: drawStyle === "fill" ? changeColor : "none",
              fillStyle: drawStyle === "fill" ? "hachure" : undefined,
            }
          );
          return {
            x1,
            y1,
            x2,
            y2,
            element,
            type,
            color: changeColor,
            style: drawStyle,
            strokeWidth: width,
          };
        case "draw":
          points = points || [];
          element = generator.linearPath(points, {
            stroke: changeColor,
            strokeWidth: width,
            roughness: 0.7,
          });
          return {
            type,
            element,
            points,
            color: changeColor,
            style: drawStyle,
            strokeWidth: width,
          };
        case "erase":
          return null;
        default:
          return null;
      }
    },
    [tool, color, style, strokeWidth]
  );

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width * canvas.width, canvas.height * canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width * canvas.width, canvas.height * canvas.height);

    const rc = rough.canvas(canvas);

    elements
      .filter((item) => item && typeof item === "object" && "element" in item)
      .forEach(({ element }) => rc.draw(element));
  }, [elements]);

  const handleMove = useCallback(
    (e) => {
      if (!drawingRef.current) {
        setMouseMove(false);
        return;
      }

      setMouseMove(true);
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const idx = elementRef.current.length - 1;
      if (idx < 0) return;

      if (tool === "draw") {
        const { points } = elementRef.current[idx];
        const newPoints = [...points, [clientX, clientY]];

        const updatedElement = createElement(
          null,
          null,
          null,
          null,
          newPoints,
          tool,
          color,
          style,
          strokeWidth
        );
        setElements((prev) => {
          const temp = [...prev];
          temp[idx] = updatedElement;
          elementRef.current = temp;
          return temp;
        });
      } else {
        const { x1, y1 } = elementRef.current[idx];
        const updatedElement = createElement(
          x1,
          y1,
          clientX,
          clientY,
          null,
          tool,
          color,
          style,
          strokeWidth
        );

        setElements((prev) => {
          const temp = [...prev];
          temp[idx] = updatedElement;
          elementRef.current = temp;
          return temp;
        });
      }
    },
    [createElement, tool, color, style, strokeWidth]
  );

  const Down = (e) => {
    drawingRef.current = true;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const element =
      tool === "draw"
        ? createElement(
            null,
            null,
            null,
            null,
            [[clientX, clientY]],
            tool,
            color,
            style,
            strokeWidth
          )
        : createElement(
            clientX,
            clientY,
            clientX,
            clientY,
            null,
            tool,
            color,
            style,
            strokeWidth
          );

    setElements((prev) => {
      const updated = [...prev, element];
      elementRef.current = updated;
      return updated;
    });
  };

  const Up = () => {
    drawingRef.current = false;
    setMouseMove(false);
  };

  useEffect(() => {
    document.body.style.cursor = mouseMove ? "crosshair" : "default";
  }, [mouseMove]);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth - 5;
    canvas.height = window.innerHeight - 5;

    const handleResize = () => {
      canvas.width = window.innerWidth - 5;
      canvas.height = window.innerHeight - 5;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("elements", JSON.stringify(elements));
  }, [elements]);

  useEffect(() => {
    const saved = localStorage.getItem("elements");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        const validItems = parsed.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            (item.type === "line" ||
              item.type === "rectangle" ||
              item.type === "draw" ||
              item.type === "ellipse")
        );

        const restored = validItems.map(
          ({ type, x1, y1, x2, y2, points, color, style, strokeWidth }) =>
            createElement(
              x1,
              y1,
              x2,
              y2,
              points,
              type,
              color,
              style,
              strokeWidth
            )
        );

        setElements(restored);
        elementRef.current = restored;
      } catch (err) {
        console.log(err);
        localStorage.removeItem("elements");
      }
    }
  }, [createElement]);

  const exportJson = () => {
    const data = JSON.stringify(elements);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "whiteBoard.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const render = new FileReader();
    render.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);

        const valid = parsed.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            (item.type === "line" ||
              item.type === "rectangle" ||
              item.type === "draw" ||
              item.type === "ellipse")
        );

        const restored = valid.map(
          ({ type, x1, y1, x2, y2, points, color, style, strokeWidth }) =>
            createElement(
              x1,
              y1,
              x2,
              y2,
              points,
              type,
              color,
              style,
              strokeWidth
            )
        );

        setElements(restored);
        elementRef.current = restored;
        console.log("Import successful");
      } catch (err) {
        console.error("Failed to import JSON:", err);
      }
    };

    render.readAsText(file);
  };

  

  return (
    <>
    <div className="mobileView">
      <h1>For better experience use in Desktop/Laptop </h1>
    </div>
      <div
        className="toolbar"
        // style={{
        //   backgroundColor: theme === "dark" ? "#222" : "#ddd",
        //   color: theme === "dark" ? "white" : "black",
        // }}
      >
        <button
          className={tool === "line" ? "active" : ""}
          onClick={() => setTool("line")}
          title="Line"
        >
          <svg width="24" height="24">
            <line
              x1="4"
              y1="20"
              x2="20"
              y2="4"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
          <small>line</small>
        </button>

        <button
          className={tool === "ellipse" ? "active" : ""}
          onClick={() => setTool("ellipse")}
          title="Ellipse"
        >
          <svg width="24" height="24">
            <ellipse
              cx="12"
              cy="12"
              rx="10"
              ry="5"
              stroke="white"
              fill="none"
              strokeWidth="2"
            />
          </svg>
          <small>ellipse</small>
        </button>

        <button
          className={tool === "rectangle" ? "active" : ""}
          onClick={() => setTool("rectangle")}
          title="Rectangle"
        >
          <svg width="24" height="24">
            <rect
              x="4"
              y="4"
              width="16"
              height="16"
              stroke="white"
              fill="none"
              strokeWidth="2"
            />
          </svg>
          <small>rectangle</small>
        </button>

        <button
          className={tool === "draw" ? "active" : ""}
          onClick={() => setTool("draw")}
          title="Draw"
        >
          <svg width="24" height="24">
            <path
              d="M4 20 C8 10, 16 10, 20 4"
              stroke="white"
              fill="none"
              strokeWidth="2"
            />
          </svg>
          <small>draw</small>
        </button>

        {/* width */}
        <button className="mobileNone">
          <p>Stroke Width:</p>
          <input
            type="range"
            min="1"
            max="10"
           
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(+e.target.value)}
          />
        </button>

        {/* <button
          className={tool === "erase" ? "active" : ""}
          onClick={() => setTool("erase")}
          title="Erase"
        >
          <svg width="24" height="24">
            <rect x="4" y="8" width="16" height="8" fill="white" />
          </svg>
          <small style={{ fontFamily: "Excalifont" }}>erase</small>
        </button> */}

        {/* save */}
       

        <button style={{ padding: "0" }}></button>

        {/* color */}
        <button>
          <p>Color : </p>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </button>

        {/* style */}
        <button className="allined">
          <small>Style:</small>
          <label htmlFor="style">
            <input
              type="radio"
              name="style"
              value="stroke"
              checked={style === "stroke"}
              onChange={(e) => setStyle(e.target.value)}
            />
            <p  className="style">Stroke</p>

            <input
              type="radio"
              name="style"
              value="fill"
              checked={style === "fill"}
              onChange={(e) => setStyle(e.target.value)}
            />
            <p  className="style">Fill</p>
          </label>
        </button>

        {/* undo */}
        <button
          onClick={() => {
            setElements((prev) => {
              if (prev.length === 0) return prev;
              const newElements = prev.slice(0, -1);
              elementRef.current = newElements;
              localStorage.setItem("elements", JSON.stringify(newElements));
              return newElements;
            });
          }}
          title="Undo"
        >
          Undo
        </button>

        {/* clear all */}
        <button
          onClick={() => {
            setElements([]);
            elementRef.current = [];
            localStorage.removeItem("elements");
          }}
          title="Clear All"
        >
          Clear All
        </button>

        <button style={{ padding: "0" }}></button>

        <button onClick={exportJson}>Export JSON</button>
        <input
          type="file"
          accept="application/json"
          onChange={importJson}
          id="import-json"
          style={{ display: "none" }}
        />

        <button>
          <label
            htmlFor="import-json"
            style={{ cursor: "pointer" }}
            className="import-button"
          >
            {" "}
            Import JSON
          </label>
        </button>
      </div>

      <button style={{ padding: "0" }}></button>

      {/* <button onClick={toggleTheme}>
        {theme === "dark" ? "Light " : "Dark "} Theme
      </button> */}

      <div className="canvas-container"><canvas
        ref={canvasRef}
        id="canvas"
        onMouseDown={Down}
        onMouseUp={Up}
        onMouseMove={handleMove}
        style={{
          // backgroundColor: theme === "dark" ? "#282c34" : "#f0f0f0",
          // border: theme === "dark" ? "1px solid #444" : "1px solid #ccc",
          backgroundColor: "black",

          cursor: mouseMove ? "crosshair" : "default",
          display: "block",
        }}
      /></div>
    </>
  );
}
