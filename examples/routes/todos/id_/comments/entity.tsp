import "../../../_types.tsp";
import "../../entity.tsp";

model Comment {
  id: CommentId;
  todoId: TodoId;
  authorId: UserId;
  body: string;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}
