import maya.cmds as cmds
import maya.api.OpenMaya as om
import maya.api.OpenMayaAnim as oma


class LashProximitySkin:
    """
    Skins eyelashes to an eyelid by proximity: each lash "island" (a connected
    shell of vertices in a combined lashes mesh) is rigidly bound to whichever
    point of the eyelid its root is closest to, by copying that point's
    skinCluster weights (barycentrically interpolated) to every vertex of the
    island. Every vertex of a given lash ends up with identical weights, so
    the lash moves as a rigid block and never stretches internally.
    """

    def __init__(self):
        self.tolerance = 1e-5

    def _get_dag_path(self, node_name):
        sel = om.MSelectionList()
        sel.add(node_name)
        path = sel.getDagPath(0)
        if path.node().hasFn(om.MFn.kTransform):
            path.extendToShape()
        return path

    def _get_mobject(self, node_name):
        sel = om.MSelectionList()
        sel.add(node_name)
        return sel.getDependNode(0)

    def _get_skin_cluster(self, dag_path):
        history = cmds.listHistory(dag_path.fullPathName(), pruneDagObjects=True, interestLevel=1) or []
        skins = [x for x in history if cmds.nodeType(x) == "skinCluster"]
        return skins[-1] if skins else None

    def _complete_vertex_component(self, vtx_count):
        fn_comp = om.MFnSingleIndexedComponent()
        component = fn_comp.create(om.MFn.kMeshVertComponent)
        fn_comp.setCompleteData(vtx_count)
        return component

    def _get_islands(self, dag_path, vtx_count):
        """Connected-component labelling: isolates each lash as its own island of vertex indices."""
        it_vtx = om.MItMeshVertex(dag_path)
        visited = [False] * vtx_count
        islands = []

        for start in range(vtx_count):
            if visited[start]:
                continue
            island = []
            stack = [start]
            visited[start] = True
            while stack:
                idx = stack.pop()
                island.append(idx)
                it_vtx.setIndex(idx)
                for neighbor in it_vtx.getConnectedVertices():
                    if not visited[neighbor]:
                        visited[neighbor] = True
                        stack.append(neighbor)
            islands.append(island)
        return islands

    def _ensure_lash_skin_cluster(self, lash_dag_path, influence_names, skin_cluster_name):
        existing = self._get_skin_cluster(lash_dag_path)

        if existing:
            skin_mobj = self._get_mobject(existing)
            fn_skin = oma.MFnSkinCluster(skin_mobj)
            scene_infs = [p.partialPathName() for p in fn_skin.influenceObjects()]
            missing = [j for j in influence_names if j not in scene_infs]
            if missing:
                cmds.skinCluster(existing, e=True, addInfluence=missing, weight=0.0)
            return existing

        name_kwargs = {"n": skin_cluster_name} if skin_cluster_name else {}
        new_skin = cmds.skinCluster(
            influence_names, lash_dag_path.fullPathName(),
            toSelectedBones=True, multi=True, **name_kwargs
        )[0]
        return new_skin

    def run(self, eyelid_mesh, lash_mesh, skin_cluster_name=None, max_search_distance=10.0):
        """
        eyelid_mesh: already-skinned eyelid geometry to copy weights from.
        lash_mesh: combined eyelashes mesh (one shell per individual lash).
        skin_cluster_name: optional name for the skinCluster created on lash_mesh.
        max_search_distance: safety cap for the closest-point search, in scene units.
        """
        eyelid_dag = self._get_dag_path(eyelid_mesh)
        lash_dag = self._get_dag_path(lash_mesh)

        eyelid_skin_name = self._get_skin_cluster(eyelid_dag)
        if not eyelid_skin_name:
            om.MGlobal.displayError(f"'{eyelid_mesh}' has no skinCluster to copy weights from.")
            return

        eyelid_fn_skin = oma.MFnSkinCluster(self._get_mobject(eyelid_skin_name))
        inf_names = [p.partialPathName() for p in eyelid_fn_skin.influenceObjects()]
        num_inf = len(inf_names)

        eyelid_fn_mesh = om.MFnMesh(eyelid_dag)
        eyelid_vtx_count = eyelid_fn_mesh.numVertices
        eyelid_complete_comp = self._complete_vertex_component(eyelid_vtx_count)

        eyelid_weights_flat, _ = eyelid_fn_skin.getWeights(eyelid_dag, eyelid_complete_comp)

        # 1. High-speed proximity search structure (API 2.0)
        world_matrix = eyelid_dag.inclusiveMatrix()
        intersector = om.MMeshIntersector()
        intersector.create(eyelid_dag.node(), world_matrix)

        lash_fn_mesh = om.MFnMesh(lash_dag)
        lash_vtx_count = lash_fn_mesh.numVertices
        lash_world_points = lash_fn_mesh.getPoints(om.MSpace.kWorld)

        lash_skin_name = self._ensure_lash_skin_cluster(lash_dag, inf_names, skin_cluster_name)
        lash_fn_skin = oma.MFnSkinCluster(self._get_mobject(lash_skin_name))
        lash_scene_infs = [p.partialPathName() for p in lash_fn_skin.influenceObjects()]
        lash_inf_map = {name: i for i, name in enumerate(lash_scene_infs)}
        num_lash_inf = len(lash_scene_infs)

        # 2. Isolate each lash ("island") in the combined mesh
        islands = self._get_islands(lash_dag, lash_vtx_count)

        full_weight_list = [0.0] * (lash_vtx_count * num_lash_inf)
        skipped = 0

        for island in islands:
            # 3. Find the root: the vertex of this lash closest to the eyelid
            best_dist = None
            best_info = None

            for vtx_idx in island:
                pt = lash_world_points[vtx_idx]
                point_info = intersector.getClosestPoint(pt, max_search_distance)
                if point_info is None:
                    continue
                world_closest = om.MPoint(point_info.point) * world_matrix
                dist = pt.distanceTo(world_closest)
                if best_dist is None or dist < best_dist:
                    best_dist = dist
                    best_info = point_info

            if best_info is None:
                skipped += len(island)
                continue

            # 4. Steal weights: barycentric sample of the eyelid skinCluster at the root
            v0, v1, v2 = eyelid_fn_mesh.getPolygonTriangleVertices(best_info.face, best_info.triangle)
            a, b = best_info.barycentricCoords
            c = 1.0 - a - b

            interpolated = [0.0] * num_inf
            for i in range(num_inf):
                w0 = eyelid_weights_flat[v0 * num_inf + i]
                w1 = eyelid_weights_flat[v1 * num_inf + i]
                w2 = eyelid_weights_flat[v2 * num_inf + i]
                interpolated[i] = a * w0 + b * w1 + c * w2

            island_weights = [0.0] * num_lash_inf
            for i, name in enumerate(inf_names):
                if name in lash_inf_map:
                    island_weights[lash_inf_map[name]] = interpolated[i]

            # 5. Flood: every vertex of this lash gets the exact same weights
            for vtx_idx in island:
                base = vtx_idx * num_lash_inf
                full_weight_list[base:base + num_lash_inf] = island_weights

        lash_complete_comp = self._complete_vertex_component(lash_vtx_count)
        m_indices = om.MIntArray(list(range(num_lash_inf)))
        m_weights = om.MDoubleArray(full_weight_list)

        prev_norm = cmds.getAttr(f"{lash_skin_name}.normalizeWeights")
        prev_max = cmds.getAttr(f"{lash_skin_name}.maintainMaxInfluences")
        cmds.setAttr(f"{lash_skin_name}.normalizeWeights", 0)
        cmds.setAttr(f"{lash_skin_name}.maintainMaxInfluences", 0)
        try:
            lash_fn_skin.setWeights(lash_dag, lash_complete_comp, m_indices, m_weights, False)
        finally:
            cmds.setAttr(f"{lash_skin_name}.normalizeWeights", prev_norm)
            cmds.setAttr(f"{lash_skin_name}.maintainMaxInfluences", prev_max)

        if skipped:
            om.MGlobal.displayWarning(f"{skipped} vertices had no eyelid point within {max_search_distance} units and were left unweighted.")
        om.MGlobal.displayInfo(f"Proximity-skinned {len(islands)} lashes onto '{lash_skin_name}' from '{eyelid_mesh}'.")


"""
Example usage:

class_call = LashProximitySkin()
class_call.run("L_eyelidGeo", "L_lashesGeo")

# with a custom skinCluster name and a tighter search radius:
class_call.run("L_eyelidGeo", "L_lashesGeo", skin_cluster_name="L_lashes_skinCluster", max_search_distance=2.0)
"""
