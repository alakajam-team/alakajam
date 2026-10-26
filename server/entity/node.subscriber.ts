import { EntitySubscriberInterface, EventSubscriber, InsertEvent, RemoveEvent } from "typeorm";
import { Entry } from "./entry.entity";
import { Node } from "./node.entity";
import { Post } from "./post.entity";

/**
 * Creates the node of new posts & entries, and deletes it along with them (cascading to comments, likes & user roles).
 * Runs in the same transaction as the post or entry being saved.
 */
@EventSubscriber()
export class NodeSubscriber implements EntitySubscriberInterface<Post | Entry> {

  public async beforeInsert(event: InsertEvent<Post | Entry>): Promise<void> {
    const nodeType = getNodeType(event.entity);
    if (nodeType && !event.entity.id) {
      const node = await event.manager.save(Node, event.manager.create(Node, { type: nodeType }));
      event.entity.id = node.id;
    }
  }

  public async afterRemove(event: RemoveEvent<Post | Entry>): Promise<void> {
    const nodeId = event.entityId ?? event.databaseEntity?.id;
    if (getNodeType(event.entity ?? event.databaseEntity) && nodeId) {
      await event.manager.delete(Node, nodeId);
    }
  }

}

function getNodeType(entity: unknown): "post" | "entry" | undefined {
  if (entity instanceof Post) {
    return "post";
  } else if (entity instanceof Entry) {
    return "entry";
  }
  return undefined;
}
