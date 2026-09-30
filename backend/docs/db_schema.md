# Database schema

Entity-relationship diagram for the No Idea backend. Table and column definitions live in `src/modules/db_schema.py`. When the schema changes, update this diagram and `scripts/seed.sql` in the same change. See [Adding SQL database tables](code_standards.md#adding-sql-database-tables).

```mermaid
erDiagram
    TASKS ||--o{ TASK_TAGS : tagged_with
    TAGS ||--o{ TASK_TAGS : applied_as
    TASKS ||--|{ TASK_TAG_RELATIONSHIPS : related_to
    TAGS ||--|{ TASK_TAG_RELATIONSHIPS : scored_on
    USERS ||--|{ USER_TAG_RELATIONSHIPS : related_to
    TAGS ||--|{ USER_TAG_RELATIONSHIPS : scored_on
    USERS ||--o{ USER_TASK_COMPLETIONS : completes
    TASKS ||--o{ USER_TASK_COMPLETIONS : completed_in
    IMAGES |o--o{ TASKS : illustrates
    USERS {
        string id PK "36 characters"
        string first_name "not null"
    }
    TAGS {
        string id PK "36 characters"
        string name "not null, 16 characters"
        string icon_name "not null, 64 characters"
    }
    IMAGES {
        string image_id PK "36 characters"
        string image_path "not null, 255 characters, relative to images/"
    }
    TASKS {
        string id PK "36 characters"
        string name "not null, 255 characters"
        string short_description "not null, 200 characters"
        string generation_instructions "not null, long text"
        string image_id FK "36 characters, nullable"
    }
    TASK_TAGS {
        string task_id PK,FK "36 characters, not null"
        string tag_id PK,FK "36 characters, not null"
        int position "not null, >= 0, unique per task, highest is most specific"
    }
    TASK_TAG_RELATIONSHIPS {
        string task_id PK,FK "36 characters, not null"
        string tag_id PK,FK "36 characters, not null"
        float value "not null, 0-1"
    }
    USER_TAG_RELATIONSHIPS {
        string user_id PK,FK "36 characters, not null"
        string tag_id PK,FK "36 characters, not null"
        float value "not null, 0-1"
    }
    USER_TASK_COMPLETIONS {
        string user_id PK,FK "36 characters, not null"
        string task_id PK,FK "36 characters, not null"
        datetime completion_time "not null"
        string comment "not null, 300 characters"
        string tips "nullable, 300 characters"
        int activity_rating "not null, 1-5"
        int recommendation_rating "nullable, 1-5"
    }
```
