import * as fs from "node:fs";
import * as path from "node:path";

interface Point {
  x: number;
  y: number;
}

interface Command {
  type: string;
  args: number[];
}

interface AbsoluteCommand {
  type: "M" | "L" | "C" | "Z";
  args: number[];
}

function tokenizePath(pathStr: string): string[] {
  const tokenRegex = /([a-df-zA-DF-Z])|(-?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
  const tokens: string[] = [];
  let match: RegExpExecArray | null = tokenRegex.exec(pathStr);
  while (match !== null) {
    if (match[1]) tokens.push(match[1]);
    else if (match[2]) tokens.push(match[2]);
    match = tokenRegex.exec(pathStr);
  }
  return tokens;
}

function parseTokens(tokens: string[]): Command[] {
  const commands: Command[] = [];
  let currentCmd: string | null = null;
  let currentArgs: number[] = [];

  const argCounts: Record<string, number> = {
    m: 2,
    M: 2,
    l: 2,
    L: 2,
    h: 1,
    H: 1,
    v: 1,
    V: 1,
    c: 6,
    C: 6,
    s: 4,
    S: 4,
    q: 4,
    Q: 4,
    t: 2,
    T: 2,
    a: 7,
    A: 7,
    z: 0,
    Z: 0,
  };

  for (const token of tokens) {
    if (/[a-zA-Z]/.test(token)) {
      if (currentCmd !== null && currentArgs.length > 0) {
        commands.push({ type: currentCmd, args: [...currentArgs] });
      }
      currentCmd = token;
      currentArgs = [];
      if (argCounts[token.toLowerCase()] === 0) {
        commands.push({ type: token, args: [] });
        currentCmd = null;
      }
    } else {
      const num = parseFloat(token);
      if (currentCmd === null) {
        continue;
      }
      currentArgs.push(num);
      const expected = argCounts[currentCmd.toLowerCase()];
      if (currentArgs.length === expected) {
        commands.push({ type: currentCmd, args: [...currentArgs] });
        if (currentCmd === "m") {
          currentCmd = "l";
        } else if (currentCmd === "M") {
          currentCmd = "L";
        }
        currentArgs = [];
      }
    }
  }
  if (currentCmd !== null && currentArgs.length > 0) {
    commands.push({ type: currentCmd, args: [...currentArgs] });
  }
  return commands;
}

function toAbsolute(commands: Command[]): AbsoluteCommand[] {
  const result: AbsoluteCommand[] = [];
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;

  for (const cmd of commands) {
    const type = cmd.type;
    const args = cmd.args;

    if (type === "M") {
      cx = args[0];
      cy = args[1];
      sx = cx;
      sy = cy;
      result.push({ type: "M", args: [cx, cy] });
    } else if (type === "m") {
      cx += args[0];
      cy += args[1];
      sx = cx;
      sy = cy;
      result.push({ type: "M", args: [cx, cy] });
    } else if (type === "L") {
      cx = args[0];
      cy = args[1];
      result.push({ type: "L", args: [cx, cy] });
    } else if (type === "l") {
      cx += args[0];
      cy += args[1];
      result.push({ type: "L", args: [cx, cy] });
    } else if (type === "H") {
      cx = args[0];
      result.push({ type: "L", args: [cx, cy] });
    } else if (type === "h") {
      cx += args[0];
      result.push({ type: "L", args: [cx, cy] });
    } else if (type === "V") {
      cy = args[0];
      result.push({ type: "L", args: [cx, cy] });
    } else if (type === "v") {
      cy += args[0];
      result.push({ type: "L", args: [cx, cy] });
    } else if (type === "C") {
      result.push({ type: "C", args: [...args] });
      cx = args[4];
      cy = args[5];
    } else if (type === "c") {
      result.push({
        type: "C",
        args: [
          cx + args[0],
          cy + args[1],
          cx + args[2],
          cy + args[3],
          cx + args[4],
          cy + args[5],
        ],
      });
      cx += args[4];
      cy += args[5];
    } else if (type === "Z" || type === "z") {
      result.push({ type: "Z", args: [] });
      cx = sx;
      cy = sy;
    }
  }

  return result;
}

function splitSubpaths(commands: AbsoluteCommand[]): AbsoluteCommand[][] {
  const subpaths: AbsoluteCommand[][] = [];
  let currentSubpath: AbsoluteCommand[] = [];

  for (const cmd of commands) {
    if (cmd.type === "M") {
      if (currentSubpath.length > 0) {
        subpaths.push(currentSubpath);
      }
      currentSubpath = [cmd];
    } else {
      currentSubpath.push(cmd);
    }
  }
  if (currentSubpath.length > 0) {
    subpaths.push(currentSubpath);
  }
  return subpaths;
}

function stringifyCommands(cmds: AbsoluteCommand[]): string {
  return cmds
    .map((cmd) => {
      if (cmd.type === "M")
        return `M ${cmd.args[0].toFixed(3)},${cmd.args[1].toFixed(3)}`;
      if (cmd.type === "L")
        return `L ${cmd.args[0].toFixed(3)},${cmd.args[1].toFixed(3)}`;
      if (cmd.type === "C") {
        return `C ${cmd.args[0].toFixed(3)},${cmd.args[1].toFixed(3)} ${cmd.args[2].toFixed(3)},${cmd.args[3].toFixed(3)} ${cmd.args[4].toFixed(3)},${cmd.args[5].toFixed(3)}`;
      }
      if (cmd.type === "Z") return "Z";
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function getVertices(cmds: AbsoluteCommand[]): Point[] {
  const points: Point[] = [];
  for (const cmd of cmds) {
    if (cmd.type === "M" || cmd.type === "L") {
      points.push({ x: cmd.args[0], y: cmd.args[1] });
    }
  }

  const unique: Point[] = [];
  for (const p of points) {
    if (unique.length === 0) {
      unique.push(p);
    } else {
      const prev = unique[unique.length - 1];
      const dist = Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
      if (dist > 0.001) {
        unique.push(p);
      }
    }
  }

  if (unique.length > 1) {
    const first = unique[0];
    const last = unique[unique.length - 1];
    const dist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
    if (dist <= 0.001) {
      unique.pop();
    }
  }

  return unique;
}

function roundPolygon(points: Point[], radius: number): string {
  if (points.length < 3) {
    return (
      `M ${points[0].x.toFixed(3)},${points[0].y.toFixed(3)} ` +
      points
        .slice(1)
        .map((p) => `L ${p.x.toFixed(3)},${p.y.toFixed(3)}`)
        .join(" ") +
      " Z"
    );
  }

  let pathStr = "";
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const pPrev = points[(i - 1 + n) % n];
    const pCurr = points[i];
    const pNext = points[(i + 1) % n];

    const dx1 = pPrev.x - pCurr.x;
    const dy1 = pPrev.y - pCurr.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    const dx2 = pNext.x - pCurr.x;
    const dy2 = pNext.y - pCurr.y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (len1 === 0 || len2 === 0) {
      if (i === 0) {
        pathStr += `M ${pCurr.x.toFixed(3)},${pCurr.y.toFixed(3)}`;
      } else {
        pathStr += ` L ${pCurr.x.toFixed(3)},${pCurr.y.toFixed(3)}`;
      }
      continue;
    }

    const r = Math.min(radius, len1 / 2, len2 / 2);

    const entryX = pCurr.x + (dx1 / len1) * r;
    const entryY = pCurr.y + (dy1 / len1) * r;

    const exitX = pCurr.x + (dx2 / len2) * r;
    const exitY = pCurr.y + (dy2 / len2) * r;

    if (i === 0) {
      pathStr += `M ${entryX.toFixed(3)},${entryY.toFixed(3)}`;
    } else {
      pathStr += ` L ${entryX.toFixed(3)},${entryY.toFixed(3)}`;
    }

    pathStr += ` Q ${pCurr.x.toFixed(3)},${pCurr.y.toFixed(3)} ${exitX.toFixed(3)},${exitY.toFixed(3)}`;
  }

  pathStr += " Z";
  return pathStr;
}

// Curve and arc commands, i.e. a path that is already smooth.
const CURVE_COMMANDS: Record<string, true> = {
  c: true,
  C: true,
  s: true,
  S: true,
  q: true,
  Q: true,
  t: true,
  T: true,
  a: true,
  A: true,
};

function smoothPath(pathStr: string, radius: number): string {
  // This runs over src/data/muscles.*.ts in place, so a second run must not rewrite curves it
  // wrote itself: the parser below only understands straight segments and would drop them.
  if (tokenizePath(pathStr).some((token) => CURVE_COMMANDS[token])) {
    return pathStr;
  }

  const tokens = tokenizePath(pathStr);
  const commands = parseTokens(tokens);
  const absolute = toAbsolute(commands);
  const subpaths = splitSubpaths(absolute);

  return subpaths
    .map((subpath) => {
      const hasCurve = subpath.some((cmd) => cmd.type === "C");
      if (hasCurve) {
        return stringifyCommands(subpath);
      }
      const vertices = getVertices(subpath);
      return roundPolygon(vertices, radius);
    })
    .join(" ");
}

// Main execution function
function run() {
  const radius = 0.45;
  const projectRoot = process.cwd();
  const frontFile = path.join(projectRoot, "src", "data", "muscles.front.ts");
  const backFile = path.join(projectRoot, "src", "data", "muscles.back.ts");

  // Update front muscles
  console.log(`Processing: ${frontFile}`);
  const contentFront = fs.readFileSync(frontFile, "utf8");
  const updatedFront = contentFront.replace(
    /path:\s*"([^"]+)"/g,
    (_match: string, pathStr: string) => {
      const smoothed = smoothPath(pathStr, radius);
      return `path: "${smoothed}"`;
    },
  );
  fs.writeFileSync(frontFile, updatedFront, "utf8");
  console.log("Front view paths updated successfully.");

  // Update back muscles
  console.log(`Processing: ${backFile}`);
  const contentBack = fs.readFileSync(backFile, "utf8");
  const updatedBack = contentBack.replace(
    /path:\s*"([^"]+)"/g,
    (_match: string, pathStr: string) => {
      const smoothed = smoothPath(pathStr, radius);
      return `path: "${smoothed}"`;
    },
  );
  fs.writeFileSync(backFile, updatedBack, "utf8");
  console.log("Back view paths updated successfully.");
}

run();
