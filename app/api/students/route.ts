import {
  handleStudentsGet,
  handleStudentsPost,
  handleStudentsDelete,
  handleStudentsPatch,
} from "@/lib/controllers/students.controller";

export const GET = handleStudentsGet;
export const POST = handleStudentsPost;
export const DELETE = handleStudentsDelete;
export const PATCH = handleStudentsPatch;

