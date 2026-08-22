export interface TreeNode {
  title: string;
  page?: number;
  level: number;
  children?: TreeNode[];
}

export interface Tree {
  title: string;
  level: number;
  children: TreeNode[];
}