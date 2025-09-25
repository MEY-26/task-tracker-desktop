<?php

namespace App\Console\Commands;

use Illuminate\Foundation\Console\ServeCommand as BaseServeCommand;
use Illuminate\Support\Carbon;
use Throwable;

class ServeCommand extends BaseServeCommand
{
    /**
     * Get the date from the given PHP server output safely.
     */
    protected function getDateFromLine($line)
    {
        try {
            return parent::getDateFromLine($line);
        } catch (Throwable $exception) {
            $line = str_replace('  ', ' ', (string) $line);

            $patterns = [
                '/([A-Za-z]{3}\s[A-Za-z]{3}\s\d{2}\s\d{2}:\d{2}:\d{2}\s\d{4})/',
            ];

            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $line, $matches) && ! empty($matches[1])) {
                    try {
                        return Carbon::createFromFormat('D M d H:i:s Y', $matches[1]);
                    } catch (Throwable $exception) {
                        // Ignore and try the next pattern.
                    }
                }
            }

            return Carbon::now();
        }
    }
}
