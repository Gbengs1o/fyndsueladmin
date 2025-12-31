import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react'; // Added useEffect, useState
import { Dimensions, Image, Modal, Platform, Pressable, Linking as RNLinking, StyleSheet, Text, View } from 'react-native'; // Added Modal, TouchableOpacity, Dimensions
import { WebView } from 'react-native-webview';

import { useAuth } from '../context/AuthContext'; // Added useAuth
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase'; // Added supabase

export interface Advert {
    id: string;
    title: string;
    type: 'banner' | 'card' | 'native' | 'video';
    content_url: string;
    cta_text?: string;
    cta_link?: string;
    start_date: string;
    end_date: string;
    priority: number;
}

interface AdvertCardProps {
    advert: Advert;
    onPress?: () => void;
    style?: any;
}

export default function AdvertCard({ advert, onPress, style }: AdvertCardProps) {
    const { colors, theme } = useTheme();
    const { user } = useAuth(); // Get user for analytics
    const [isVideoModalVisible, setVideoModalVisible] = useState(false);

    // Track Analytics
    const trackInteraction = useCallback(async (eventType: 'click' | 'impression') => {
        try {
            await supabase.from('ad_analytics').insert({
                advert_id: advert.id,
                event_type: eventType,
                user_id: user?.id || null, // Optional user tracking
                metadata: { platform: Platform.OS, timestamp: new Date().toISOString() }
            });
        } catch (error) {
            console.log('Analytics Error:', error);
        }
    }, [advert.id, user?.id]);

    // Track Impression on Mount
    useEffect(() => {
        trackInteraction('impression');
    }, []);

    const handlePress = useCallback(async () => {
        if (onPress) {
            onPress();
        }

        trackInteraction('click');

        // Check if Video -> Open Modal
        const isVideoContent = advert.type === 'video' || (advert.content_url && (advert.content_url.includes('youtube.com') || advert.content_url.includes('youtu.be')));

        if (isVideoContent) {
            setVideoModalVisible(true);
            return;
        }

        // Standard Link handling for non-video: prefer CTA link, fallback to content URL ONLY if it's not just the image itself (unless desired)
        // Usually, we only want to navigate if there is an explicit destination or if the content is a web page.
        // But for now, let's assume content_url is a valid fallback if cta_link is missing, but prioritize cta_link with smart handling.

        let urlToOpen = advert.cta_link;

        // If no CTA link, we might decide NOT to open the content_url if it's just the image (Cloudinary), 
        // as users expect a landing page. But if the user setup implies content_url IS the landing page (generic banner), we keep it.
        // Safest bet based on user request "takes me anywhere" is to try cta_link first, then content_url.
        if (!urlToOpen && advert.content_url) {
            urlToOpen = advert.content_url;
        }

        if (urlToOpen) {
            // Auto-prepend https:// if missing and not a special schema
            if (!/^https?:\/\//i.test(urlToOpen) && !/^mailto:/i.test(urlToOpen) && !/^tel:/i.test(urlToOpen) && !/^sms:/i.test(urlToOpen)) {
                urlToOpen = 'https://' + urlToOpen;
            }

            try {
                // canOpenURL can be flaky on Android with basic http/https, often better to just try openURL
                await RNLinking.openURL(urlToOpen);
            } catch (error) {
                console.warn("Failed to open link:", urlToOpen, error);
            }
        }
    }, [advert, onPress, trackInteraction]);

    // Helper to get YouTube ID
    const getYtId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const isVideo = advert.type === 'video' || (advert.content_url && (advert.content_url.includes('youtube.com') || advert.content_url.includes('youtu.be')));
    const youtubeId = isVideo ? getYtId(advert.content_url) : null;
    const imageUrl = youtubeId
        ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
        : advert.content_url;

    // HTML for YouTube player with proper IFrame API
    const youtubeHtml = youtubeId ? `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
                #player { width: 100%; height: 100%; }
                iframe { width: 100%; height: 100%; border: none; }
            </style>
        </head>
        <body>
            <div id="player"></div>
            <script>
                var tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                var firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

                var player;
                function onYouTubeIframeAPIReady() {
                    player = new YT.Player('player', {
                        videoId: '${youtubeId}',
                        playerVars: {
                            'autoplay': 1,
                            'mute': 1,
                            'controls': 0,
                            'loop': 1,
                            'playlist': '${youtubeId}',
                            'playsinline': 1,
                            'rel': 0,
                            'showinfo': 0,
                            'modestbranding': 1,
                            'fs': 0,
                            'iv_load_policy': 3,
                            'disablekb': 1
                        },
                        events: {
                            'onReady': onPlayerReady,
                            'onStateChange': onPlayerStateChange
                        }
                    });
                }

                function onPlayerReady(event) {
                    event.target.mute();
                    event.target.playVideo();
                }

                function onPlayerStateChange(event) {
                    if (event.data === YT.PlayerState.ENDED) {
                        player.seekTo(0);
                        player.playVideo();
                    }
                }
            </script>
        </body>
        </html>
    ` : '';

    // HTML for Generic Video (Cloudinary, standard MP4, etc.)
    const genericVideoHtml = (isVideo && !youtubeId) ? `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: 100%; height: 100%; overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center; }
                video { width: 100%; height: 100%; object-fit: cover; }
            </style>
        </head>
        <body>
            <video 
                src="${advert.content_url}" 
                autoplay 
                muted 
                loop 
                playsinline
                webkit-playsinline
                preload="auto"
            ></video>
        </body>
        </html>
    ` : '';

    const openCtaLink = async () => {
        let urlToOpen = advert.cta_link || advert.content_url;
        if (urlToOpen) {
            if (!/^https?:\/\//i.test(urlToOpen) && !/^mailto:/i.test(urlToOpen) && !/^tel:/i.test(urlToOpen) && !/^sms:/i.test(urlToOpen)) {
                urlToOpen = 'https://' + urlToOpen;
            }
            try {
                await RNLinking.openURL(urlToOpen);
            } catch (e) {
                console.warn("Failed to open CTA link:", urlToOpen, e);
            }
        }
    };

    // YouTube HTML with Sound for Modal (Muted=0)
    const youtubeHtmlUnmuted = youtubeId ? `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
                #player { width: 100%; height: 100%; }
            </style>
        </head>
        <body>
            <div id="player"></div>
            <script>
                var tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                var firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                var player;
                function onYouTubeIframeAPIReady() {
                    player = new YT.Player('player', {
                        videoId: '${youtubeId}',
                        playerVars: { 'autoplay': 1, 'mute': 0, 'controls': 1, 'loop': 1, 'playlist': '${youtubeId}', 'playsinline': 1, 'rel': 0, 'modestbranding': 1 },
                        events: { 'onReady': onPlayerReady }
                    });
                }
                function onPlayerReady(event) { event.target.playVideo(); }
            </script>
        </body>
        </html>
    ` : '';

    const genericVideoHtmlUnmuted = (isVideo && !youtubeId) ? `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: 100%; height: 100%; overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center; }
                video { width: 100%; height: 100%; object-fit: contain; }
            </style>
        </head>
        <body>
            <video src="${advert.content_url}" autoplay controls loop playsinline webkit-playsinline></video>
        </body>
        </html>
    ` : '';

    return (
        <>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                            {advert.title}
                        </Text>
                        <View style={styles.adBadge}>
                            <Text style={styles.adBadgeText}>Sponsored</Text>
                        </View>
                    </View>
                    {advert.cta_text && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.ctaButton,
                                pressed && { opacity: 0.8 }
                            ]}
                            onPress={handlePress}
                        >
                            <Text style={styles.ctaText}>{advert.cta_text}</Text>
                            <Ionicons name="arrow-forward" size={12} color="#fff" />
                        </Pressable>
                    )}
                </View>

                {isVideo ? (
                    <View style={styles.mediaContainer}>
                        <WebView
                            key={youtubeId ? `yt-preview-${youtubeId}` : `gen-preview-${advert.id}`}
                            androidLayerType="hardware"
                            style={{ flex: 1, opacity: 0.9 }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            allowsInlineMediaPlayback={true}
                            mediaPlaybackRequiresUserAction={false}
                            originWhitelist={['*']}
                            source={{
                                html: youtubeId ? youtubeHtml : genericVideoHtml,
                                baseUrl: youtubeId ? 'https://www.youtube.com' : undefined
                            }}
                            scrollEnabled={false}
                            bounces={false}
                        />
                        {/* Transparent Overlay to capture click for Modal */}
                        <Pressable style={StyleSheet.absoluteFill} onPress={handlePress} />

                        {/* Play Icon Overlay */}
                        <View style={styles.playOverlay} pointerEvents="none">
                            <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 50 }}>
                                <Ionicons name="play" size={32} color="#fff" style={{ marginLeft: 4 }} />
                            </View>
                        </View>
                    </View>
                ) : (
                    <Pressable onPress={handlePress} style={styles.mediaContainer}>
                        {imageUrl && (
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.image}
                                resizeMode="cover"
                            />
                        )}
                    </Pressable>
                )}
            </View>

            {/* Full Screen Video Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isVideoModalVisible}
                onRequestClose={() => setVideoModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <Pressable style={styles.closeButton} onPress={() => setVideoModalVisible(false)}>
                        <Ionicons name="close-circle" size={40} color="#fff" />
                    </Pressable>

                    <View style={styles.modalVideoContainer}>
                        <WebView
                            key={youtubeId ? `yt-full-${youtubeId}` : `gen-full-${advert.id}`}
                            style={{ flex: 1, backgroundColor: '#000' }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            allowsInlineMediaPlayback={true}
                            mediaPlaybackRequiresUserAction={false}
                            source={{
                                html: youtubeId ? youtubeHtmlUnmuted : genericVideoHtmlUnmuted,
                                baseUrl: youtubeId ? 'https://www.youtube.com' : undefined
                            }}
                        />
                    </View>

                    {advert.cta_text && (
                        <Pressable style={styles.modalCtaButton} onPress={openCtaLink}>
                            <Text style={styles.modalCtaText}>{advert.cta_text}</Text>
                            <Ionicons name="open-outline" size={20} color="#fff" />
                        </Pressable>
                    )}
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.2)',
        backgroundColor: '#1a1a2e',
        overflow: 'hidden',
        marginVertical: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: { elevation: 4 },
        }),
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 12,
        gap: 12,
    },
    mediaContainer: {
        position: 'relative',
        width: '100%',
        height: 200,
        backgroundColor: '#000',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    adBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    adBadgeText: {
        color: '#aaa',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        maxWidth: 220,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00c853',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        gap: 4,
    },
    ctaText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalVideoContainer: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height * 0.4, // 40% height for video
        backgroundColor: '#000',
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        right: 20,
        zIndex: 100,
        padding: 10,
    },
    modalCtaButton: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 60 : 40,
        backgroundColor: '#00c853',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: { elevation: 6 },
        }),
    },
    modalCtaText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    }
});
