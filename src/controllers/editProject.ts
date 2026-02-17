import { Request, Response } from "express";
import { updateProjectDataFile } from "../services/updateRepo";

export const handleEditProject = async (req: Request, res: Response) => {
  const { repoName, projectData, commitMessage } = req.body;

  try {
    if (!commitMessage) {
      res.status(300).json({ message: "Commit message is required" });
      return;
    }
    await updateProjectDataFile(repoName, projectData, commitMessage);
    res.status(200).json({ message: "Project updated successfully" });
    return;
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Failed to update project" });
    return;
  }
};
