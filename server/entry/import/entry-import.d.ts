import { BookshelfModel } from "bookshelf";

/**
 * Importer spec
 */
export interface EntryImporter {
    /**
     * Constants to configure the importer
     */
    config: ScrapingEntryImporterConfig | OAuthEntryImporterConfig;
    /**
     * 
      * 'profileIdentifier' is either an OAuth authorization key (if mode is 'oauth'), or a profile name/URL otherwise.
      * The function must return an array of entry references.
     */
    fetchEntryReferences: (profileIdentifier: string) => Promise<EntryReference[] | EntryImporterError>;
    
    /**
     * The function grabs the detailed info of an entry.
     */
    fetchEntryDetails: (entryReference: EntryReference) => Promise<EntryDetails | EntryImporterError>;
}

interface AbstractEntryImporterConfig {
    /**
     * some unique string
     */
    id: string;
    /**
     * full importer name as listed on the client-side
     */
    title: string;
}
interface ScrapingEntryImporterConfig extends AbstractEntryImporterConfig {
    mode: 'scraping';
}
interface OAuthEntryImporterConfig extends AbstractEntryImporterConfig {
    mode: 'oauth';
    /**
     * URL to send the user to for authentication
     */
    oauthUrl: string;
}

export interface EntryReference {
    /**
     * Unique entry ID (use the importer name + profile name + remote entry ID to generate this).
     * Must be usable as a filename.
     */
    id: string;
    /**
     * Entry title
     */
    title: string;
    /**
     * Optional link to the remote entry
     */
    link?: string;
    /**
     * Optional remote thumbnail picture of the entry
     */
    thumbnail?: string;
    /**
     *  Any additional info required by the importer for downloading the entry details
     */
    importerProperties?: Record<string, any>;
    /**
     * (Internal field, not to be used by importer implementations)
     */
    existingEntry?: BookshelfModel;
}

export interface EntryDetails {
    /**
     * The same ID as in the entry reference
     */
    id: string;
    /**
     * Entry title
     */
    title: string;
    /**
     * Event title
     */
    externalEvent: string;
    /**
     * Optional entry publication date
     */
    published?: Date;
    /**
     * Optional URL of a picture to download
     */
    picture?: string;
    /**
     * An array of links to play the game
     */
    links: Array<{ url: string; label: string; }>
    /**
     * Optional array of entry platforms
     */
    platforms?: string[];
    /**
     * Optional short description (plain text)
     */
    description?: string;
    /** 
     * Detailed description (plain text or Markdown, no HTML)
     */
    body: string;
    /**
     * Optional game division
     */
    division?: 'solo' | 'team';
}

export interface EntryImporterError {
    error: string;
}
