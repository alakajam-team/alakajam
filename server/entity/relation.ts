/**
 * Wrapper type for singular relation properties (equivalent to TypeORM 0.3's `Relation`).
 *
 * It prevents decorator metadata from referencing the related entity class while classes are
 * still being defined. Without it, circular entity imports crash the SWC-compiled dev server
 * with "Cannot access 'X' before initialization".
 */
export type Relation<T> = T;
