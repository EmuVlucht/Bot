#!/usr/bin/env bash
# search_jensen.sh
# Cari string pada nama file/folder dan isi file dengan output berwarna.
# Usage:
#   ./search_jensen.sh [path]
# default path = current directory

# Warna ANSI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
RESET='\033[0m'

# Daftar path yang diabaikan (bisa dimodifikasi sesuai kebutuhan)
EXCLUDE_PATHS=(
    "*/node_modules/*"
    "*/.git/*"
    "*/.cache/*"
    "*/cache/*"
    "*/.tmp/*"
    "*/tmp/*"
    "*/.Trash/*"
    "*/Android/data/*"
    "*/Android/obb/*"
    "*/Android/media/*"
)

# Fungsi untuk teks disko bergerak
print_disco_animated() {
    local text="$1"
    local colors=("$RED" "$GREEN" "$YELLOW" "$BLUE" "$MAGENTA" "$CYAN")
    local color_count=${#colors[@]}
    local length=${#text}
    local frames=20
    local delay=0.05
    
    # Mode 1: Kiri ke Kanan
    for (( frame=0; frame<frames; frame++ )); do
        echo -ne "\r"
        for (( i=0; i<length; i++ )); do
            color_index=$(( (i + frame) % color_count ))
            echo -en "${colors[$color_index]}${text:$i:1}"
        done
        echo -en "$RESET"
        sleep $delay
    done
    
    # Mode 2: Kanan ke Kiri
    for (( frame=0; frame<frames; frame++ )); do
        echo -ne "\r"
        for (( i=0; i<length; i++ )); do
            color_index=$(( (i - frame + color_count * 100) % color_count ))
            echo -en "${colors[$color_index]}${text:$i:1}"
        done
        echo -en "$RESET"
        sleep $delay
    done
    
    # Mode 3: Tengah ke Pinggir
    for (( frame=0; frame<frames; frame++ )); do
        echo -ne "\r"
        local mid=$((length / 2))
        for (( i=0; i<length; i++ )); do
            local distance=$(( i > mid ? i - mid : mid - i ))
            color_index=$(( (distance + frame) % color_count ))
            echo -en "${colors[$color_index]}${text:$i:1}"
        done
        echo -en "$RESET"
        sleep $delay
    done
    
    # Mode 4: Pinggir ke Tengah
    for (( frame=0; frame<frames; frame++ )); do
        echo -ne "\r"
        local mid=$((length / 2))
        for (( i=0; i<length; i++ )); do
            local distance=$(( i > mid ? i - mid : mid - i ))
            color_index=$(( (color_count - distance + frame) % color_count ))
            echo -en "${colors[$color_index]}${text:$i:1}"
        done
        echo -en "$RESET"
        sleep $delay
    done
    
    echo # Newline setelah animasi selesai
}

# Fungsi untuk highlight case-insensitive
highlight_query() {
    local line="$1"
    local query="$2"
    
    # Gunakan awk untuk case-insensitive replacement
    echo "$line" | awk -v q="$query" -v blue="$BLUE" -v reset="$RESET" '
    {
        result = ""
        text = $0
        query_len = length(q)
        
        while (length(text) > 0) {
            # Cari posisi query (case-insensitive)
            pos = index(tolower(text), tolower(q))
            
            if (pos > 0) {
                # Tambahkan teks sebelum match
                result = result substr(text, 1, pos - 1)
                # Tambahkan match dengan warna biru
                result = result blue substr(text, pos, query_len) reset
                # Lanjutkan dari setelah match
                text = substr(text, pos + query_len)
            } else {
                # Tidak ada match lagi
                result = result text
                break
            }
        }
        print result
    }'
}

# Fungsi untuk build exclude arguments untuk find
build_find_excludes() {
    local excludes=""
    for path in "${EXCLUDE_PATHS[@]}"; do
        excludes="$excludes -path '$path' -prune -o"
    done
    echo "$excludes"
}

# Fungsi untuk build exclude arguments untuk grep
build_grep_excludes() {
    local excludes=""
    for path in "${EXCLUDE_PATHS[@]}"; do
        # Convert wildcard pattern ke grep exclude format
        local pattern=$(echo "$path" | sed 's/\*/*/g' | sed 's/^\*\///' | sed 's/\/\*$//')
        excludes="$excludes --exclude-dir='$pattern'"
    done
    echo "$excludes"
}

# Fungsi untuk menambah exclude path
add_exclude() {
    echo -e "${CYAN}Path yang saat ini diabaikan:${RESET}"
    for i in "${!EXCLUDE_PATHS[@]}"; do
        echo "  $((i+1)). ${EXCLUDE_PATHS[$i]}"
    done
    echo
    echo -e "${GREEN}Masukkan path yang ingin diabaikan (kosongkan untuk skip):${RESET}"
    echo -e "${YELLOW}Contoh: */folder/*, /sdcard/DCIM/*, *.log${RESET}"
    read -p "> " new_exclude
    
    if [[ -n "$new_exclude" ]]; then
        EXCLUDE_PATHS+=("$new_exclude")
        echo -e "${GREEN}✓ Path '$new_exclude' ditambahkan ke daftar exclude${RESET}"
    fi
}

# Menu untuk exclude configuration
configure_excludes() {
    while true; do
        echo
        echo -e "${CYAN}=== Konfigurasi Path yang Diabaikan ===${RESET}"
        echo "1. Lihat daftar path yang diabaikan"
        echo "2. Tambah path baru yang ingin diabaikan"
        echo "3. Hapus path dari daftar"
        echo "4. Reset ke default"
        echo "5. Lanjut ke pencarian"
        echo
        read -p "Pilih (1-5): " choice
        
        case $choice in
            1)
                echo -e "\n${CYAN}Path yang diabaikan:${RESET}"
                for i in "${!EXCLUDE_PATHS[@]}"; do
                    echo "  $((i+1)). ${EXCLUDE_PATHS[$i]}"
                done
                ;;
            2)
                add_exclude
                ;;
            3)
                echo -e "\n${CYAN}Path yang diabaikan:${RESET}"
                for i in "${!EXCLUDE_PATHS[@]}"; do
                    echo "  $((i+1)). ${EXCLUDE_PATHS[$i]}"
                done
                read -p "Nomor yang ingin dihapus (0 untuk batal): " num
                if [[ "$num" =~ ^[0-9]+$ ]] && [ "$num" -gt 0 ] && [ "$num" -le "${#EXCLUDE_PATHS[@]}" ]; then
                    removed="${EXCLUDE_PATHS[$((num-1))]}"
                    unset 'EXCLUDE_PATHS[$((num-1))]'
                    EXCLUDE_PATHS=("${EXCLUDE_PATHS[@]}") # Reindex array
                    echo -e "${GREEN}✓ Path '$removed' dihapus${RESET}"
                fi
                ;;
            4)
                EXCLUDE_PATHS=(
                    "*/node_modules/*"
                    "*/.git/*"
                    "*/.cache/*"
                    "*/cache/*"
                    "*/.tmp/*"
                    "*/tmp/*"
                    "*/.Trash/*"
                    "*/Android/data/*"
                    "*/Android/obb/*"
                )
                echo -e "${GREEN}✓ Reset ke default${RESET}"
                ;;
            5)
                break
                ;;
            *)
                echo -e "${RED}Pilihan tidak valid${RESET}"
                ;;
        esac
    done
}

# Tanyakan apakah ingin konfigurasi exclude
echo -e "${CYAN}Ingin mengatur folder/file yang diabaikan? (y/n):${RESET}"
read -p "> " config_choice

if [[ "$config_choice" =~ ^[Yy]$ ]]; then
    configure_excludes
fi

# Input query
echo
echo -en "${GREEN}"
read -p "Masukan Sesuatu yang mau dicari : " QUERY
echo -en "$RESET"

ROOT="${1:-.}"

# Tampilkan pesan pencarian dengan efek disko animasi
echo
print_disco_animated "Mencari: '$QUERY' di: $ROOT"
echo

# Build exclude arguments
find_excludes=""
for path in "${EXCLUDE_PATHS[@]}"; do
    find_excludes="$find_excludes -path '$path' -prune -o"
done

grep_excludes=""
for path in "${EXCLUDE_PATHS[@]}"; do
    # Extract folder name from pattern
    folder=$(echo "$path" | sed 's/.*\/\([^\/]*\)\/\*.*/\1/' | sed 's/\*//')
    if [[ -n "$folder" && "$folder" != "$path" ]]; then
        grep_excludes="$grep_excludes --exclude-dir=$folder"
    fi
done

# Pencarian pada NAMA file/folder
echo -e "${YELLOW}>>> Pencarian pada NAMA file / folder:${RESET}"
eval "find '$ROOT' $find_excludes -iname '*$QUERY*' -print 2>/dev/null" | while IFS= read -r line; do
    highlight_query "$line" "$QUERY"
done

echo
# Pencarian pada ISI file
echo -e "${YELLOW}>>> Pencarian pada ISI file (rekursif):${RESET}"
eval "grep -RInF $grep_excludes --binary-files=text --line-number '$QUERY' '$ROOT' 2>/dev/null" | while IFS= read -r line; do
    highlight_query "$line" "$QUERY"
done

echo
echo -e "${GREEN}Selesai.${RESET}"
