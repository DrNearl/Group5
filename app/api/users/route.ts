import {
  handleUsersGet,
  handleUsersPost,
  handleUsersPatch,
  handleUsersDelete,
} from "@/lib/controllers/users.controller";

export const GET = handleUsersGet;
export const POST = handleUsersPost;
export const PATCH = handleUsersPatch;
export const DELETE = handleUsersDelete;
