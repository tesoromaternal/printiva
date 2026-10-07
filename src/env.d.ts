/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    /** Lo pone el middleware cuando hay una sesión de admin válida. */
    admin?: { username: string };
  }
}
