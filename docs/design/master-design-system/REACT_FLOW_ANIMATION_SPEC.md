# REACT FLOW / VISUAL WORKFLOW BUILDER — UI AND ANIMATION SPECIFICATION
Version 1.0 | Stateflow Builder and other node-based visual editors

## 1. Purpose
Use a node-based canvas for Stateflow and other genuine workflow-design experiences. The canvas should feel responsive and alive through meaningful interaction feedback, not constant decorative animation.

## 2. Recommended library
**React Flow (`@xyflow/react`)** is recommended if the actual app is React-based:
- Documentation: https://reactflow.dev/
- Getting started: https://reactflow.dev/learn
- API reference: https://reactflow.dev/api-reference
- Examples: https://reactflow.dev/examples
- GitHub: https://github.com/xyflow/xyflow

Check the current repository and existing graph/canvas dependencies before installing. Do not replace an existing stable builder without comparing its capabilities and migration risks.

## 3. Suggested package setup
If the application uses React and does not already have React Flow:

```bash
npm install @xyflow/react
```

Import the base stylesheet once at the application/builder entry point:

```tsx
import "@xyflow/react/dist/style.css";
```

Use the project's existing icon, typography and styling system. Do not introduce a second design system inside the builder.

## 4. Recommended builder layout

### Top builder toolbar
Left:
- Back to module.
- Builder title and module name.
- Draft/saved status.

Right:
- Undo / redo.
- Zoom controls if not already provided by canvas controls.
- Validate.
- Test / simulate.
- Save.
- Publish, only where supported and permission-authorized.

### Left toolbox
- Search nodes.
- Group node types by actual workflow concepts.
- Drag node onto canvas.
- Use short descriptions and clear icons.
- Keep the toolbox collapsible to preserve canvas space.

### Center canvas
- Large white or very light neutral canvas.
- Subtle dot/grid background.
- Nodes with consistent dimensions and readable text.
- Straight or orthogonal connectors as the default where that matches the existing Stateflow reference.
- Clear ports/handles.
- Avoid unnecessary curved Bezier connectors if the existing product convention calls for straight arrows.
- Minimap only when the graph is large enough to benefit.
- Zoom/pan controls.
- Fit-to-view action.

### Right properties panel
When a node or edge is selected:
- Name and type.
- Current status/transition details.
- Conditions and actions.
- Validation issues.
- Available configuration.
- Save/apply controls only if the current architecture requires them.

On smaller screens, use a drawer or overlay instead of permanently squeezing the canvas.

## 5. Node visual design
- White node surface.
- Thin neutral border.
- Moderate radius.
- Clear title and concise secondary detail.
- Small colored type icon/marker.
- Selected node: restrained violet outline or soft violet surface.
- Error node: red semantic marker and readable error text.
- Disabled node: muted appearance and accessible explanation.
- Keep node types visually distinct without making every node a different saturated color.

## 6. Meaningful animation and live feedback

Use animation to communicate a real state change:

### Connection creation
- Highlight valid connection handles on hover/drag.
- Show a subtle connector preview while dragging.
- Snap to valid targets.
- Invalid connections should show a clear red/invalid state and accessible message.
- Avoid flashing or bouncing nodes.

### Edge animation
- Use React Flow's `animated` edge option only when movement communicates something meaningful, such as an active path or simulated execution.
- Default edges should remain still and visually calm.
- Use straight/step edges where appropriate to the established diagram style.
- Use a restrained moving dash or flow indicator for a currently executing transition, not every connector.

### Node selection
- Subtle border/outline transition.
- Soft selected background.
- No large scale bounce.
- Keep selection feedback quick and consistent.

### Validation
- Show a progress indicator while validation runs.
- Mark invalid nodes and edges.
- Provide an issue list with click-to-focus navigation.
- Do not claim validation passed before the actual validator returns success.

### Simulation / execution
- Show the active node/edge path as the simulation progresses.
- Use a small pulse or moving dash only on the currently active transition.
- Show success, waiting, blocked and failed states distinctly.
- Include pause/stop/reset only if the simulation engine supports them.
- Make the execution trace understandable without relying only on animation.

### Save and publish
- Show saving, saved and failed states.
- Do not show “Saved” until persistence confirms success.
- Publishing must use the actual existing publish workflow and permission checks.

## 7. Example React Flow pattern

This is an illustrative starting point, not a drop-in replacement for the application's existing builder:

```tsx
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes = [
  {
    id: "start",
    position: { x: 80, y: 120 },
    data: { label: "Submitted" },
    type: "default",
  },
  {
    id: "review",
    position: { x: 360, y: 120 },
    data: { label: "Under Review" },
    type: "default",
  },
];

const initialEdges = [
  {
    id: "start-review",
    source: "start",
    target: "review",
    type: "step",
    animated: false,
    label: "Review",
  },
];

export function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = (connection) => {
    setEdges((current) =>
      addEdge(
        { ...connection, type: "step", animated: false },
        current
      )
    );
  };

  return (
    <div className="workflow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background variant="dots" gap={20} size={1} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
```

Important:
- This example uses local component state only to illustrate the library.
- Integrate the actual application's persisted workflow model, validation engine and permission rules.
- Use stable IDs from the real model.
- Do not leave sample nodes in production.
- If the product requires straight connectors, use an appropriate straight edge type rather than the example's step edge.
- Verify the installed React Flow version's exact API before implementation.

## 8. Animation implementation guidance
Prefer CSS transitions and React Flow's built-in state/edge capabilities for basic feedback. If the application already uses Motion (`motion` / Framer Motion), reuse it for carefully scoped panel transitions and micro-interactions. Do not add an animation dependency just for hover effects.

Good:
- 120–200 ms hover/selection transitions.
- 150–250 ms drawer/panel transitions.
- Subtle active-path animation during simulation.
- Smooth drag and zoom.
- Reduced-motion support.

Avoid:
- Constant animation on all edges.
- Blinking notifications.
- Large bounce effects.
- Animated gradients behind the canvas.
- Motion that slows down editing or makes node positions feel unstable.

## 9. Stateflow-specific visual constraints
Respect the existing Facilio State Flow conventions and source reference:
- State boxes should be clear and consistent.
- Transition labels should be readable.
- Straight directional arrows should be the default if required by the existing design.
- Cross-module links and custom actions must remain visible where already part of the product.
- Preserve existing state/transition semantics and special custom-button flows.
- Do not convert a customer-facing state flow into a generic developer flowchart.

## 10. Accessibility
- Keyboard navigation for nodes and controls where supported.
- Accessible names for icon-only controls.
- Clear focus rings.
- Do not convey execution state only through color or animation.
- Respect reduced-motion preferences.
- Ensure text contrast and usable hit areas.

## 11. Acceptance checklist
- Canvas remains the main work surface.
- Toolbox and properties panel do not obscure it.
- Straight/orthogonal edges match the established diagram language.
- Animation is used only to communicate meaningful interactions or execution.
- Validation errors are visible and navigable.
- Save/publish state is accurate.
- Existing workflow data, permissions and APIs remain intact.
- Customer POV cannot access internal-only workflow details.
