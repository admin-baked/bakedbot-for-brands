<?php
/**
 * Plugin Name: BakedBot Mailjet Mailer
 * Description: Routes WordPress transactional mail through Mailjet SMTP.
 */

if (!defined('ABSPATH')) {
    exit;
}

function bakedbot_mailjet_sender_email(): string
{
    $from = getenv('MAILJET_SENDER_EMAIL');
    if (is_string($from) && $from !== '') {
        return $from;
    }

    return 'hello@bakedbot.ai';
}

function bakedbot_mailjet_sender_name(): string
{
    $name = getenv('MAILJET_SENDER_NAME');
    if (is_string($name) && $name !== '') {
        return $name;
    }

    return 'BakedBot AI';
}

function bakedbot_mailjet_smtp_enabled(): bool
{
    $apiKey = getenv('MAILJET_API_KEY');
    $secretKey = getenv('MAILJET_SECRET_KEY');

    return is_string($apiKey) && $apiKey !== '' && is_string($secretKey) && $secretKey !== '';
}

add_filter('wp_mail_from', static function (): string {
    return bakedbot_mailjet_sender_email();
});

add_filter('wp_mail_from_name', static function (): string {
    return bakedbot_mailjet_sender_name();
});

add_action('phpmailer_init', static function ($phpmailer): void {
    if (!bakedbot_mailjet_smtp_enabled()) {
        return;
    }

    $apiKey = (string) getenv('MAILJET_API_KEY');
    $secretKey = (string) getenv('MAILJET_SECRET_KEY');
    $host = getenv('MAILJET_SMTP_HOST');
    $port = getenv('MAILJET_SMTP_PORT');
    $secure = getenv('MAILJET_SMTP_SECURE');

    $phpmailer->isSMTP();
    $phpmailer->Host = (is_string($host) && $host !== '') ? $host : 'in-v3.mailjet.com';
    $phpmailer->Port = (is_string($port) && $port !== '') ? (int) $port : 587;
    $phpmailer->SMTPAuth = true;
    $phpmailer->Username = $apiKey;
    $phpmailer->Password = $secretKey;
    $phpmailer->SMTPSecure = (is_string($secure) && $secure !== '')
        ? $secure
        : ($phpmailer->Port === 465 ? 'ssl' : 'tls');
    $phpmailer->From = bakedbot_mailjet_sender_email();
    $phpmailer->FromName = bakedbot_mailjet_sender_name();
    $phpmailer->Sender = bakedbot_mailjet_sender_email();
    $phpmailer->Timeout = 20;
});
