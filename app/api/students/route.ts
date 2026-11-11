import {
  handleStudentsGet,
  handleStudentsPost,
  handleStudentsDelete,
  handleStudentsPut,
} from "@/lib/controllers/students.controller";

export const GET = handleStudentsGet;
export const POST = handleStudentsPost;
export const DELETE = handleStudentsDelete;
export const PUT = handleStudentsPut;

