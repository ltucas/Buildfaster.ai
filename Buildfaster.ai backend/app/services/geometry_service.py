import os
import trimesh

def generate_building_glb(blueprint_id: str, width: float, height: float, depth: float) -> str:
    """
    Creates a dynamic 3D building model (.glb) based on extracted dimensions
    from the uploaded PDF blueprint to display in the Google 3D viewer.
    """
    try:
        # Create a basic building shape (box)
        mesh = trimesh.creation.box(extents=(width, height, depth))
        
        # Translate so the building base sits above the ground plane (Y axis is UP in gltf)
        transform = trimesh.transformations.translation_matrix([0, height / 2.0, 0])
        mesh.apply_transform(transform)
        
        # Apply a simple Material so glTF renderer can see it physically 
        material = trimesh.visual.material.PBRMaterial(baseColorFactor=[180, 190, 200, 255])
        mesh.visual = trimesh.visual.TextureVisuals(material=material)
        
        file_name = f"building_{blueprint_id}.glb"
        file_path = os.path.join("app", "static", file_name)
        
        # Export as a standardized GLB (binary glTF) file for <model-viewer>
        mesh.export(file_path)
        return file_name
        
    except Exception as e:
        print(f"Failed to generate 3D model: {e}")
        return "building.glb" # Default fallback
