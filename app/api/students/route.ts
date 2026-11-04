import {
  handleStudentsGet,
  handleStudentsPost,
  handleStudentsDelete,
} from "@/lib/controllers/students.controller";

export const GET = handleStudentsGet;
export const POST = handleStudentsPost;
export const DELETE = handleStudentsDelete;

